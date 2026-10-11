import type { Context } from "hono";
import { type AppBindings, isRecord } from "../types.js";
import { loadDocWithAccessCheck } from "../utils/document-access.js";
import { normalizeEmail } from "../utils/email.js";
import { nanoid } from "../utils/ids.js";
import { requireRateLimit } from "../utils/rate-limit.js";
import { requireViewerBrowserCapability } from "../utils/request-security.js";

export const REPORT_REASONS = ["phishing", "malware", "spam", "illegal", "harassment", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

const MAX_DETAILS_LENGTH = 2000;

function isReportReason(value: unknown): value is ReportReason {
  return typeof value === "string" && (REPORT_REASONS as readonly string[]).includes(value);
}

/** POST /d/:id/report — any viewer of a document can flag it for review. */
export async function reportDocument(c: Context<AppBindings>): Promise<Response> {
  const id = c.req.param("id") ?? "";

  const rateLimited = await requireRateLimit(c, "REPORT_RATE_LIMITER");
  if (rateLimited) return rateLimited;

  const protectedResponse = await requireViewerBrowserCapability(c, id);
  if (protectedResponse) return protectedResponse;

  const user = c.get("authUser");
  const result = await loadDocWithAccessCheck(c.env, id, normalizeEmail(user.email));
  if (!result) return c.json({ error: "not found" }, 404);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid request body" }, 400);
  }
  if (!isRecord(body) || !isReportReason(body.reason)) {
    return c.json({ error: `reason must be one of: ${REPORT_REASONS.join(", ")}` }, 400);
  }
  const details = typeof body.details === "string" ? body.details.trim().slice(0, MAX_DETAILS_LENGTH) : "";

  const reporter = user.id === "unauthenticated" ? "anonymous" : normalizeEmail(user.email);
  const reportId = nanoid(12);
  await result.registry.createReport({ id: reportId, docId: id, reason: body.reason, details, reporter });
  console.warn({ event: "abuse_report", id: reportId, docId: id, reason: body.reason });

  return c.json({ ok: true, id: reportId }, 201);
}
