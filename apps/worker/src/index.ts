import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { isAuthEnabled, type AppBindings } from "./types.js";
import { getAuthMiddleware } from "./utils/auth.js";
import { api } from "./routes/api.js";
import { viewer } from "./routes/viewer.js";
import { docs } from "./routes/docs.js";
import webhooks from "./routes/webhooks.js";
import { createCapabilityToken } from "./utils/capability.js";
import { getAssetUrls } from "./utils/assets.js";
import { normalizeEmail } from "./utils/email.js";
import { getRegistry } from "./utils/registry.js";
import { formatRelativeTime, formatDocumentSize, formatBytes, formatAccountAge, buildHomePath } from "./utils/home-view.js";
import { toHtml, safeJsonForScript } from "./frontend/jsx.js";
import { DashboardView } from "./frontend/dashboard.js";
import { TagView } from "./frontend/tag.js";
import { LoginView } from "./frontend/login.js";

export { DocumentDO } from "./durable-objects/document.js";
export { RegistryDO } from "./durable-objects/registry.js";

const app = new Hono<AppBindings>();

async function renderHomeFromTemplate(c: any, email: string) {
  const url = new URL(c.req.url);
  const query = (url.searchParams.get("q") || "").trim();
  const requestedPage = Number.parseInt(url.searchParams.get("page") || "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 10;
  const workerUrl = `${url.protocol}//${url.host}`;

  const registry = getRegistry(c.env);
  const [documentsPage, recentViews, userStats, globalStats] = await Promise.all([
    registry.listDocumentsPage(email, { query, limit: pageSize, page }),
    registry.getRecentViews(email, 3),
    registry.getUserStats(email),
    registry.getGlobalStats(),
  ]);

  const assets = await getAssetUrls(c.env.ASSETS);
  const homeCapabilityToken = await createCapabilityToken(c.env, {
    scope: "home",
    email,
    documentId: null,
  });

  // Load the HTML template
  const templateResponse = await c.env.ASSETS.fetch(new Request("http://assets/home.html"));
  let html = await templateResponse.text();

  // Replace placeholders with data
  html = html.replace(/\{\{assets_css\}\}/g, assets.homeCss || "");
  html = html.replace(/\{\{assets_js\}\}/g, assets.homeClientJs || "");
  html = html.replace(/\{\{email\}\}/g, email);
  html = html.replace(/\{\{user_doc_count\}\}/g, String(userStats.docCount));
  html = html.replace(/\{\{storage_used\}\}/g, formatBytes(userStats.storageUsed));
  html = html.replace(/\{\{total_views\}\}/g, String(userStats.totalViews));
  html = html.replace(/\{\{account_age\}\}/g, formatAccountAge(userStats.accountAge));
  html = html.replace(/\{\{global_users\}\}/g, String(globalStats.totalUsers));
  html = html.replace(/\{\{global_docs\}\}/g, String(globalStats.totalDocs));
  html = html.replace(/\{\{global_views\}\}/g, String(globalStats.totalViews));

  // Handle authentication conditionals
  const isAuthenticated = c.get("authUser").id !== "unauthenticated";
  html = html.replace(/\{\{clerk_publishable_key\}\}/g, c.env.CLERK_PUBLISHABLE_KEY || "");
  html = html.replace(/\{\{#authenticated\}\}([\s\S]*?)\{\{\/authenticated\}\}/g, isAuthenticated ? "$1" : "");
  html = html.replace(/\{\{\^authenticated\}\}([\s\S]*?)\{\{\/authenticated\}\}/g, isAuthenticated ? "" : "$1");
  html = html.replace(/\{\{#clerk_button\}\}([\s\S]*?)\{\{\/clerk_button\}\}/g, c.env.CLERK_PUBLISHABLE_KEY ? "$1" : "");
  html = html.replace(/\{\{#requires_login\}\}([\s\S]*?)\{\{\/requires_login\}\}/g, isAuthEnabled(c.env.AUTH_MODE) ? "$1" : "");
  html = html.replace(/\{\{#global_stats\}\}([\s\S]*?)\{\{\/global_stats\}\}/g, "$1");

  // Build recent views HTML
  const recentViewsHtml = recentViews.map(doc => {
    const viewedAt = doc.last_viewed_at || doc.created_at;
    return `<a class="recent-card" href="/d/${doc.id}.html">
      <div class="recent-card-title">${doc.title}</div>
      <div class="recent-card-filename">${doc.filename}</div>
      <div class="recent-card-meta">viewed ${formatRelativeTime(viewedAt)}</div>
    </a>`;
  }).join("\n");
  html = html.replace(/\{\{#has_recent_views\}\}[\s\S]*?\{\{\{recent_views_html\}\}\}[\s\S]*?\{\{\/has_recent_views\}\}/g, recentViews.length > 0 ? `<div class="recent-grid">${recentViewsHtml}</div>` : "");

  // Build documents HTML
  const documentsHtml = documentsPage.documents.map(doc => {
    return `<a class="doc-card" href="/d/${doc.id}.html">
      <div class="doc-card-top">
        <span class="doc-card-title">${doc.title}</span>
        <span class="doc-card-filename">${doc.filename}</span>
      </div>
      <div class="doc-card-meta">
        ${formatDocumentSize(doc.size)} • ${formatRelativeTime(doc.created_at)}
      </div>
    </a>`;
  }).join("\n");
  html = html.replace(/\{\{\{documents_html\}\}\}/g, documentsHtml);

  // Build pagination HTML
  let paginationHtml = "";
  if (documentsPage.totalCount > pageSize) {
    const totalPages = Math.ceil(documentsPage.totalCount / pageSize);
    const prevDisabled = page <= 1 ? 'disabled' : '';
    const nextDisabled = page >= totalPages ? 'disabled' : '';
    const prevPage = page - 1;
    const nextPage = page + 1;

    paginationHtml = `<div class="pagination">
      <a class="pagination-link ${prevDisabled}" href="${buildHomePath(query, prevPage)}">← Previous</a>
      <span class="pagination-info">Page ${page} of ${totalPages}</span>
      <a class="pagination-link ${nextDisabled}" href="${buildHomePath(query, nextPage)}">Next →</a>
    </div>`;
  }
  html = html.replace(/\{\{\{pagination_html\}\}\}/g, paginationHtml);

  // Build home config JSON
  const homeConfig = {
    page,
    pageSize,
    homeCapabilityToken,
    requiresLogin: isAuthEnabled(c.env.AUTH_MODE),
    ...(c.env.CLERK_PUBLISHABLE_KEY && { clerkPublishableKey: c.env.CLERK_PUBLISHABLE_KEY }),
  };
  html = html.replace(/\{\{\{home_config\}\}\}/g, safeJsonForScript(homeConfig));

  return html;
}

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error({
    level: "error",
    event: "unhandled_error",
    timestamp: new Date().toISOString(),
    method: c.req.method,
    url: c.req.url,
    error: err.message,
    stack: err.stack,
  });
  return c.json({ error: "Internal Server Error" }, 500);
});

app.get("/health", (c) => c.json({ status: "ok" }));

// Public routes (no auth)
app.route("/docs", docs);
app.route("/webhooks", webhooks);

app.use("/*", async (c, next) => {
  const middleware = getAuthMiddleware(c.env.AUTH_MODE);
  return middleware(c, next);
});

app.route("/api", api);
app.route("/", viewer);

app.get("/llms.txt", async (c) => {
  const registry = getRegistry(c.env);
  const docs = await registry.listPublicDocuments(); // We'll need to implement this
  const url = new URL(c.req.url);
  const origin = `${url.protocol}//${url.host}`;
  
  const lines = [
    "# sharehtml documents",
    "",
    "A list of publicly available documents.",
    "",
    ...docs.map((d) => `- [${d.title}](${origin}/d/${d.id}) (${d.size} bytes)`),
  ];
  
  return c.text(lines.join("\n"));
});

// Public login page (no auth required)
app.get("/login", async (c) => {
  const url = new URL(c.req.url);
  const redirectUrl = url.searchParams.get("redirect") || "/dashboard";

  const assets = await getAssetUrls(c.env.ASSETS);

  return c.html(
    LoginView({
      assets,
      redirectUrl,
      authMode: c.env.AUTH_MODE,
      clerkPublishableKey: c.env.CLERK_PUBLISHABLE_KEY,
    }),
  );
});

app.get("/dashboard", async (c) => {
  // Redirect unauthenticated users to login page
  if (c.get("authUser").id === "unauthenticated") {
    return c.redirect("/login?redirect=/dashboard");
  }

  const email = normalizeEmail(c.get("authUser").email);
  const url = new URL(c.req.url);
  const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = 10;

  const registry = getRegistry(c.env);

  const documentsPage = await registry.listDocumentsPage(email, { query: "", limit: pageSize, page });

  const workerUrl = `${url.protocol}//${url.host}`;
  const assets = await getAssetUrls(c.env.ASSETS);
  const homeCapabilityToken = await createCapabilityToken(c.env, {
    scope: "home",
    email,
    documentId: null,
  });

  return c.html(
    DashboardView({
      assets,
      email,
      workerUrl,
      documents: documentsPage.documents,
      page: documentsPage.page,
      pageSize,
      totalCount: documentsPage.totalCount,
      homeCapabilityToken,
      authMode: c.env.AUTH_MODE,
      clerkPublishableKey: c.env.CLERK_PUBLISHABLE_KEY,
    }),
  );
});

app.get("/tag/:tag", async (c) => {
  // Redirect unauthenticated users to login page
  if (c.get("authUser").id === "unauthenticated") {
    const tag = c.req.param("tag");
    return c.redirect(`/login?redirect=/tag/${encodeURIComponent(tag)}`);
  }

  const tag = c.req.param("tag");
  const email = normalizeEmail(c.get("authUser").email);

  const registry = getRegistry(c.env);
  const documents = await registry.listDocumentsByTag(email, tag, 50);

  const url = new URL(c.req.url);
  const workerUrl = `${url.protocol}//${url.host}`;
  const assets = await getAssetUrls(c.env.ASSETS);
  const homeCapabilityToken = await createCapabilityToken(c.env, {
    scope: "home",
    email,
    documentId: null,
  });

  return c.html(
    TagView({
      assets,
      email,
      workerUrl,
      tag,
      documents,
      totalCount: documents.length,
      homeCapabilityToken,
      authMode: c.env.AUTH_MODE,
      clerkPublishableKey: c.env.CLERK_PUBLISHABLE_KEY,
    }),
  );
});

app.get("/", async (c) => {
  const email = normalizeEmail(c.get("authUser").email);
  const html = await renderHomeFromTemplate(c, email);

  // Add cache headers for static HTML content
  return c.html(html, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300",
      "CDN-Cacheable": "public",
    },
  });
});

export default app;
