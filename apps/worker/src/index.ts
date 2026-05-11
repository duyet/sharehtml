import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { isAuthEnabled, type AppBindings } from "./types.js";
import { getAuthMiddleware } from "./utils/auth.js";
import { api } from "./routes/api.js";
import { viewer } from "./routes/viewer.js";
import { docs } from "./routes/docs.js";
import webhooks from "./routes/webhooks.js";
import { createCapabilityToken } from "./utils/capability.js";
import { cspHeader } from "./utils/csp.js";
import { getAssetUrls } from "./utils/assets.js";
import { normalizeEmail } from "./utils/email.js";
import { getRegistry } from "./utils/registry.js";
import { DashboardView } from "./frontend/dashboard.js";
import { TagView } from "./frontend/tag.js";
import { HomeView } from "./frontend/home.js";

export { DocumentDO } from "./durable-objects/document.js";
export { RegistryDO } from "./durable-objects/registry.js";

const app = new Hono<AppBindings>();

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
  const docs = await registry.listPublicDocuments();
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

// Legacy /login route — Clerk modal now handles sign-in inline.
app.get("/login", (c) => c.redirect("/"));

app.get("/dashboard", async (c) => {
  const authUser = c.get("authUser");
  const isAuthenticated = authUser.id !== "unauthenticated";

  // Unauthenticated visitors see an empty dashboard; the client-side Clerk modal
  // (mounted via dashboard-client.ts) prompts for sign-in.
  if (!isAuthenticated) {
    const url = new URL(c.req.url);
    const workerUrl = `${url.protocol}//${url.host}`;
    const assets = await getAssetUrls(c.env.ASSETS);
    const homeCapabilityToken = await createCapabilityToken(c.env, {
      scope: "home",
      email: "",
      documentId: null,
    });
    return c.html(
      DashboardView({
        assets,
        email: "",
        workerUrl,
        documents: [],
        page: 1,
        pageSize: 10,
        totalCount: 0,
        homeCapabilityToken,
        authMode: c.env.AUTH_MODE,
        clerkPublishableKey: c.env.CLERK_PUBLISHABLE_KEY,
        cfBeaconToken: c.env.CF_BEACON_TOKEN,
        requiresAuth: true,
      }),
      {
        headers: {
          "Content-Security-Policy": cspHeader({
            clerkPublishableKey: c.env.CLERK_PUBLISHABLE_KEY,
          }),
        },
      },
    );
  }

  const email = normalizeEmail(authUser.email);
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
      cfBeaconToken: c.env.CF_BEACON_TOKEN,
    }),
    {
      headers: {
        "Content-Security-Policy": cspHeader({
          clerkPublishableKey: c.env.CLERK_PUBLISHABLE_KEY,
        }),
      },
    },
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
    {
      headers: {
        "Content-Security-Policy": cspHeader({
          clerkPublishableKey: c.env.CLERK_PUBLISHABLE_KEY,
        }),
      },
    },
  );
});

app.get("/", async (c) => {
  try {
    const email = normalizeEmail(c.get("authUser").email);
    const url = new URL(c.req.url);
    const query = (url.searchParams.get("q") || "").trim();
    const requestedPage = Number.parseInt(url.searchParams.get("page") || "1", 10);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const pageSize = 10;
    const workerUrl = `${url.protocol}//${url.host}`;

    const assets = await getAssetUrls(c.env.ASSETS);
    const registry = getRegistry(c.env);
    const [documentsPage, recentViews] = await Promise.all([
      registry.listDocumentsPage(email, { query, limit: pageSize, page }),
      registry.getRecentViews(email, 3),
    ]);

    const homeCapabilityToken = await createCapabilityToken(c.env, {
      scope: "home",
      email,
      documentId: null,
    });
  return c.html(
    HomeView({
      assets,
      email,
      workerUrl,
      documents: documentsPage.documents,
      recentViews,
      page,
      pageSize,
      totalCount: documentsPage.totalCount,
      query,
      requiresLogin: false,  // Home page is always public
      homeCapabilityToken,
      authMode: c.env.AUTH_MODE,
      clerkPublishableKey: c.env.CLERK_PUBLISHABLE_KEY,
      cfBeaconToken: c.env.CF_BEACON_TOKEN,
    }),
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300",
        "CDN-Cacheable": "public",
        "Content-Security-Policy": cspHeader({
          clerkPublishableKey: c.env.CLERK_PUBLISHABLE_KEY,
        }),
      },
    },
  );
  } catch (err) {
    console.error("Home page error:", err);
    return c.json({ error: "Home page failed to load" }, 500);
  }
});

export default app;
