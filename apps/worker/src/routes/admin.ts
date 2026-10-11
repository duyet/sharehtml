import { Hono } from "hono";
import { type AppBindings, isRecord } from "../types.js";
import { isAdminEmail } from "../utils/abuse-config.js";
import { getRegistry } from "../utils/registry.js";
import { requireHomeBrowserCapability } from "../utils/request-security.js";

// Moderation endpoints, mounted at /api/admin. Admins are listed in the
// ADMIN_EMAILS env var (comma-separated).
const admin = new Hono<AppBindings>();

const MAX_LIST_LIMIT = 500;

function parseLimit(value: string | undefined): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, MAX_LIST_LIMIT) : 100;
}

admin.use("*", async (c, next) => {
  const user = c.get("authUser");
  if (user.id === "unauthenticated") {
    return c.json({ error: "Authentication required" }, 401);
  }
  if (!isAdminEmail(c.env, user.email)) {
    return c.json({ error: "Admin access required", code: "not_admin" }, 403);
  }
  const protectedResponse = await requireHomeBrowserCapability(c, { requireOrigin: c.req.method !== "GET" });
  if (protectedResponse) return protectedResponse;
  await next();
});

admin.get("/reports", async (c) => {
  const reports = await getRegistry(c.env).listReports(parseLimit(c.req.query("limit")));
  return c.json({ reports });
});

admin.get("/documents", async (c) => {
  const documents = await getRegistry(c.env).listRecentDocuments(parseLimit(c.req.query("limit")));
  // Delete tokens let anyone delete a document; never hand them out here.
  return c.json({ documents: documents.map(({ delete_token: _token, ...doc }) => doc) });
});

admin.post("/documents/:id/disable", async (c) => {
  const id = c.req.param("id");
  let body: unknown = {};
  try {
    body = await c.req.json();
  } catch {
    // Reason is optional.
  }
  const reason =
    isRecord(body) && typeof body.reason === "string" && body.reason.trim()
      ? body.reason.trim().slice(0, 500)
      : "abuse";

  const registry = getRegistry(c.env);
  if (!(await registry.getDocument(id))) {
    return c.json({ error: "not found" }, 404);
  }
  const { delete_token: _token, ...document } = (await registry.setDocumentDisabled(id, reason)) ?? {};
  console.warn({ event: "admin_disable", id, reason, admin: c.get("authUser").email });
  return c.json({ ok: true, document });
});

admin.post("/documents/:id/enable", async (c) => {
  const id = c.req.param("id");
  const registry = getRegistry(c.env);
  if (!(await registry.getDocument(id))) {
    return c.json({ error: "not found" }, 404);
  }
  const { delete_token: _token, ...document } = (await registry.setDocumentDisabled(id, null)) ?? {};
  console.warn({ event: "admin_enable", id, admin: c.get("authUser").email });
  return c.json({ ok: true, document });
});

export { admin };
