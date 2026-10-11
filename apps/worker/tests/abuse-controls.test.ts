import { createExecutionContext, runInDurableObject, waitOnExecutionContext } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { HomeView } from "../src/frontend/home.js";
import app from "../src/index.js";
import { isRecord, type AbuseControlVars, type DocumentRow } from "../src/types.js";
import type { DocumentDO } from "../src/durable-objects/document.js";
import type { RegistryDO } from "../src/durable-objects/registry.js";
import { anonymousUploadsAllowed, isAdminEmail } from "../src/utils/abuse-config.js";
import { rateLimitKey } from "../src/utils/rate-limit.js";

type TestEnv = typeof env & AbuseControlVars & Record<string, unknown>;

const BLOCKED: RateLimit = { limit: async () => ({ success: false }) };

function registry() {
  return env.REGISTRY_DO.get(env.REGISTRY_DO.idFromName("global"));
}

async function fetchWith(overrides: Partial<TestEnv>, url: string, init?: RequestInit) {
  const ctx = createExecutionContext();
  const res = await app.fetch(new Request(url, init), { ...env, ...overrides } as TestEnv, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

function uploadForm(content = "<h1>hi</h1>", extra: Record<string, string> = {}): FormData {
  const form = new FormData();
  form.append("file", new File([content], "abuse.html", { type: "text/html" }));
  for (const [key, value] of Object.entries(extra)) form.append(key, value);
  return form;
}

async function json(res: Response): Promise<Record<string, unknown>> {
  const body: unknown = await res.json();
  if (!isRecord(body)) throw new Error("expected JSON object");
  return body;
}

async function createDoc(id: string, fields: Partial<Parameters<RegistryDO["createDocument"]>[0]> = {}) {
  await registry().createDocument({
    id,
    title: "Doc",
    filename: "doc.html",
    size: 10,
    owner_email: "owner@example.com",
    is_shared: 1,
    rendered_filename: "doc.html",
    ...fields,
  });
  await env.DOCUMENTS_BUCKET.put(`${id}/rendered/doc.html`, "<h1>doc</h1>");
}

async function expireNow(id: string) {
  const stub = registry();
  await runInDurableObject(stub, (instance: RegistryDO) => {
    instance.sql.exec("UPDATE documents SET expires_at = datetime('now', '-1 minute') WHERE id = ?", id);
  });
}

describe("listed flag", () => {
  it("public listing only shows opted-in, link-shared, live, non-anonymous documents", async () => {
    await createDoc("list-yes", { listed: true });
    await createDoc("list-default");
    await createDoc("list-private", { listed: true, is_shared: 0 });
    await createDoc("list-anon", { listed: true, owner_email: "anonymous" });
    await createDoc("list-disabled", { listed: true });
    await registry().setDocumentDisabled("list-disabled", "spam");

    const ids = (await registry().listPublicDocuments()).map((doc) => doc.id);
    expect(ids).toContain("list-yes");
    // Link sharing alone must not publish a document to the homepage.
    expect(ids).not.toContain("list-default");
    expect(ids).not.toContain("list-private");
    expect(ids).not.toContain("list-anon");
    expect(ids).not.toContain("list-disabled");
  });

  it("leaving link sharing clears the listed flag", async () => {
    await createDoc("list-unshare", { listed: true });
    await registry().setDocumentShareMode("list-unshare", 0);
    await registry().setDocumentShareMode("list-unshare", 1);
    expect((await registry().getDocument("list-unshare"))?.listed).toBe(0);
  });

  it("publish accepts listed=true and defaults to unlisted", async () => {
    const listedRes = await exports.default.fetch("https://example.com/api/v1/publish", {
      method: "POST",
      body: uploadForm("<p>a</p>", { listed: "true" }),
    });
    expect(listedRes.status).toBe(201);
    const listed = await json(listedRes);
    expect(listed.listed).toBe(true);

    const plainRes = await exports.default.fetch("https://example.com/api/v1/publish", {
      method: "POST",
      body: uploadForm("<p>b</p>"),
    });
    const plain = await json(plainRes);
    expect(plain.listed).toBe(false);
    expect((await registry().getDocument(String(plain.id)))?.listed).toBe(0);
  });

  it("escapes listed titles on the homepage", () => {
    const html = String(
      HomeView({
        assets: {
          homeClientJs: "", shellClientJs: "", shellClientCss: "", homeCss: "", dashboardCss: "",
          dashboardClientJs: "", collabJs: "", docsCss: "", shared: "",
        },
        email: "unauthenticated@clerk",
        workerUrl: "https://example.com",
        documents: [{
          id: "x", title: "<script>alert(1)</script>", filename: "x.html", size: 1, owner_email: "o@e.com",
          is_shared: 1, created_at: "2026-01-01 00:00:00", rendered_filename: null, source_filename: null,
          source_kind: null, source_language: null,
        } satisfies DocumentRow],
        recentViews: [],
        analytics: {
          totalDocs: 0, todayUploads: 0, totalViews: 0, totalUsers: null, totalStorage: null, todayViews: 0,
          uploadsPerDay: [], viewsPerDay: [], calendar: [{ date: "2026-01-01", uploads: 0, views: 0 }], sharedDocs: 0, avgViewsPerDoc: 0,
        },
        page: 1, pageSize: 10, totalCount: 0, query: "", requiresLogin: false, homeCapabilityToken: "t",
        authMode: "clerk", isAuthenticated: false,
      }),
    );
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});

describe("upload size and quota", () => {
  it("rejects files over MAX_UPLOAD_BYTES with 413", async () => {
    const res = await fetchWith({ MAX_UPLOAD_BYTES: "100" }, "https://example.com/api/documents", {
      method: "POST",
      body: uploadForm("x".repeat(200)),
    });
    expect(res.status).toBe(413);
    expect((await json(res)).code).toBe("upload_too_large");
  });

  it("rejects oversized Content-Length before parsing the body", async () => {
    const res = await fetchWith({ MAX_UPLOAD_BYTES: "10" }, "https://example.com/api/documents", {
      method: "POST",
      headers: { "Content-Length": String(100 * 1024), "Content-Type": "multipart/form-data; boundary=x" },
      body: "x".repeat(100 * 1024),
    });
    expect(res.status).toBe(413);
  });

  it("enforces the per-user document quota with 429", async () => {
    await createDoc("quota-existing", { owner_email: "dev@localhost" });
    const res = await fetchWith({ USER_QUOTA_DOCS: "1" }, "https://example.com/api/documents", {
      method: "POST",
      body: uploadForm(),
    });
    expect(res.status).toBe(429);
    expect((await json(res)).code).toBe("quota_exceeded");
  });

  it("enforces the per-user storage quota on new uploads", async () => {
    const res = await fetchWith({ USER_QUOTA_BYTES: "1" }, "https://example.com/api/documents", {
      method: "POST",
      body: uploadForm("<p>more than one byte</p>"),
    });
    expect(res.status).toBe(429);
  });
});

describe("rate limiting", () => {
  it("returns 429 when the upload limiter refuses", async () => {
    const res = await fetchWith({ UPLOAD_RATE_LIMITER: BLOCKED }, "https://example.com/api/documents", {
      method: "POST",
      body: uploadForm(),
    });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("limits document views and websocket connects separately", async () => {
    await createDoc("rl-view");
    const view = await fetchWith({ VIEW_RATE_LIMITER: BLOCKED }, "https://example.com/d/rl-view");
    expect(view.status).toBe(429);

    const viewAllowed = await fetchWith({ WS_RATE_LIMITER: BLOCKED }, "https://example.com/d/rl-view");
    expect(viewAllowed.status).toBe(200);

    const ws = await fetchWith({ WS_RATE_LIMITER: BLOCKED }, "https://example.com/d/rl-view/ws", {
      headers: { Upgrade: "websocket" },
    });
    expect(ws.status).toBe(429);
  });

  it("drops comments over the comment limit inside the document DO", async () => {
    const stub = env.DOCUMENT_DO.get(env.DOCUMENT_DO.idFromName("rl-comments"));
    const result = await runInDurableObject(stub, async (instance: DocumentDO) => {
      const sent: string[] = [];
      const ws = {
        send: (message: string) => sent.push(message),
        deserializeAttachment: () => ({ email: "a@b.com", name: "A", color: "#000", rateLimitKey: "ip:1.1.1.1" }),
      } as unknown as WebSocket;
      const message = (id: string) =>
        JSON.stringify({ type: "comment:create", id, content: "spam", anchor: null, parent_id: null });

      Object.assign(instance, { env: { ...env, COMMENT_RATE_LIMITER: BLOCKED } });
      await instance.webSocketMessage(ws, message("blocked-comment"));
      const blocked = instance.sql.exec("SELECT id FROM comments").toArray().length;
      return { blocked, sent };
    });
    expect(result.blocked).toBe(0);
    expect(result.sent.some((m) => m.includes('"type":"error"'))).toBe(true);
  });

  it("keys by verified email or CF-Connecting-IP, never X-Forwarded-For", () => {
    const headers = (values: Record<string, string>) => ({ header: (name: string) => values[name] });
    const spoofed = headers({ "X-Forwarded-For": "1.2.3.4" });
    expect(rateLimitKey({ id: "dev", email: "dev@localhost", source: "dev" }, spoofed)).toBe("ip:unknown");
    expect(
      rateLimitKey({ id: "dev", email: "dev@localhost", source: "dev" }, headers({ "CF-Connecting-IP": "9.9.9.9" })),
    ).toBe("ip:9.9.9.9");
    expect(rateLimitKey({ id: "apikey:1", email: "A@B.com", source: "api-key" }, spoofed)).toBe("user:a@b.com");
    // The shared unauthenticated Clerk identity must not become one global bucket.
    expect(
      rateLimitKey(
        { id: "unauthenticated", email: "unauthenticated@clerk", source: "dev" },
        headers({ "CF-Connecting-IP": "5.5.5.5" }),
      ),
    ).toBe("ip:5.5.5.5");
  });
});

describe("anonymous publishing", () => {
  const clerkNoSession = { AUTH_MODE: "clerk", CLERK_SECRET_KEY: undefined } as Partial<TestEnv>;

  it("is disabled by default when auth is enabled", async () => {
    expect(anonymousUploadsAllowed({ AUTH_MODE: "clerk" })).toBe(false);
    expect(anonymousUploadsAllowed({ AUTH_MODE: "access" })).toBe(false);
    expect(anonymousUploadsAllowed({ AUTH_MODE: "clerk", ALLOW_ANONYMOUS_UPLOADS: "true" })).toBe(true);

    const res = await fetchWith(clerkNoSession, "https://example.com/api/documents", {
      method: "POST",
      body: uploadForm(),
    });
    expect(res.status).toBe(401);
    expect((await json(res)).code).toBe("auth_required");
  });

  it("when enabled, anonymous docs expire, are never listed, and are purged", async () => {
    const res = await fetchWith(
      { ...clerkNoSession, ALLOW_ANONYMOUS_UPLOADS: "true", ANONYMOUS_TTL_DAYS: "7" },
      "https://example.com/api/documents",
      { method: "POST", body: uploadForm("<p>anon</p>", { listed: "true" }) },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    const id = String(body.id);
    expect(body.listed).toBe(false);
    expect(typeof body.expiresAt).toBe("string");

    const row = await registry().getDocument(id);
    expect(row?.owner_email).toBe("anonymous");
    expect(row?.listed).toBe(0);
    expect(row?.expires_at).toBeTruthy();
    expect((await exports.default.fetch(`https://example.com/d/${id}`)).status).toBe(200);

    await expireNow(id);
    // Expired documents are hidden on read even before the alarm runs.
    expect((await exports.default.fetch(`https://example.com/d/${id}`)).status).toBe(404);

    const purged = await registry().purgeExpiredDocuments();
    expect(purged).toContain(id);
    expect(await registry().getDocument(id)).toBeNull();
    expect(await env.DOCUMENTS_BUCKET.list({ prefix: `${id}/` }).then((r) => r.objects.length)).toBe(0);
  });
});

describe("reports and takedown", () => {
  it("accepts a report from a viewer and lists it for admins", async () => {
    await createDoc("report-me");
    const bad = await exports.default.fetch("https://example.com/d/report-me/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "nonsense" }),
    });
    expect(bad.status).toBe(400);

    const res = await exports.default.fetch("https://example.com/d/report-me/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "phishing", details: "fake login form" }),
    });
    expect(res.status).toBe(201);

    const reports = await fetchWith({ ADMIN_EMAILS: "admin@x.com, dev@localhost" }, "https://example.com/api/admin/reports");
    expect(reports.status).toBe(200);
    const list = (await json(reports)).reports;
    expect(Array.isArray(list)).toBe(true);
    expect(JSON.stringify(list)).toContain("fake login form");
  });

  it("rate limits reports", async () => {
    await createDoc("report-limited");
    const res = await fetchWith({ REPORT_RATE_LIMITER: BLOCKED }, "https://example.com/d/report-limited/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "spam" }),
    });
    expect(res.status).toBe(429);
  });

  it("admin endpoints require ADMIN_EMAILS membership", async () => {
    expect(isAdminEmail({ ADMIN_EMAILS: " Admin@X.com ,b@y.com" }, "admin@x.com")).toBe(true);
    expect(isAdminEmail({}, "dev@localhost")).toBe(false);
    const res = await fetchWith({ ADMIN_EMAILS: "someone@else.com" }, "https://example.com/api/admin/documents");
    expect(res.status).toBe(403);
    expect((await json(res)).code).toBe("not_admin");
  });

  it("disabled documents return 451 on every viewer route until re-enabled", async () => {
    await createDoc("takedown");
    const admin = { ADMIN_EMAILS: "dev@localhost" };
    const disable = await fetchWith(admin, "https://example.com/api/admin/documents/takedown/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "phishing" }),
    });
    expect(disable.status).toBe(200);

    for (const path of ["/d/takedown", "/d/takedown.html", "/d/takedown/content", "/d/takedown/source"]) {
      expect((await exports.default.fetch(`https://example.com${path}`)).status).toBe(451);
    }

    const recent = await json(await fetchWith(admin, "https://example.com/api/admin/documents"));
    expect(JSON.stringify(recent.documents)).toContain('"disabled_reason":"phishing"');

    const enable = await fetchWith(admin, "https://example.com/api/admin/documents/takedown/enable", { method: "POST" });
    expect(enable.status).toBe(200);
    expect((await exports.default.fetch("https://example.com/d/takedown")).status).toBe(200);
  });
});
