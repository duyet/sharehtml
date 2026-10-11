import type { Context, MiddlewareHandler } from "hono";
import type { AppBindings } from "../types.js";
import type { AuthUser } from "./auth.js";

/**
 * Rate limiting backed by the Workers Rate Limiting binding
 * (https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
 * Counters are shared per Cloudflare location, unlike an in-isolate Map.
 * Limits and periods live in wrangler.jsonc `ratelimits`.
 */
export type RateLimiterName =
  | "UPLOAD_RATE_LIMITER"
  | "WRITE_RATE_LIMITER"
  | "VIEW_RATE_LIMITER"
  | "WS_RATE_LIMITER"
  | "COMMENT_RATE_LIMITER"
  | "REPORT_RATE_LIMITER";

type RateLimitHeaders = { header: (name: string) => string | undefined };

function isIdentifiedUser(user: AuthUser | undefined): user is AuthUser {
  // "dev" covers AUTH_MODE=none (everyone is dev@localhost) and the shared
  // unauthenticated Clerk placeholder; neither identifies a single client.
  return Boolean(user && user.id !== "unauthenticated" && user.source !== "dev");
}

/**
 * Key by verified user email, else by CF-Connecting-IP. X-Forwarded-For is
 * client-controlled and never used.
 */
export function rateLimitKey(user: AuthUser | undefined, req: RateLimitHeaders): string {
  if (isIdentifiedUser(user)) return `user:${user.email.toLowerCase()}`;
  return `ip:${req.header("CF-Connecting-IP") || "unknown"}`;
}

export async function isRateLimited(
  limiter: RateLimit,
  key: string,
): Promise<boolean> {
  const { success } = await limiter.limit({ key });
  return !success;
}

export function tooManyRequests(c: Context<AppBindings>): Response {
  return c.json({ error: "Too many requests, slow down and retry shortly", code: "rate_limited" }, 429, {
    "Retry-After": "60",
  });
}

/** Returns a 429 response when the caller is over the named limit, else null. */
export async function requireRateLimit(
  c: Context<AppBindings>,
  name: RateLimiterName,
): Promise<Response | null> {
  const key = rateLimitKey(c.get("authUser"), c.req);
  return (await isRateLimited(c.env[name], key)) ? tooManyRequests(c) : null;
}

/**
 * Limits public viewer traffic under /d/*. Websocket upgrades use their own
 * limiter so a page load does not burn the connect budget and vice versa.
 */
export const viewerRateLimit: MiddlewareHandler<AppBindings> = async (c, next) => {
  // Reports have their own, stricter limiter in the report handler.
  if (c.req.method === "POST" && c.req.path.endsWith("/report")) return next();
  const name: RateLimiterName = c.req.path.endsWith("/ws") ? "WS_RATE_LIMITER" : "VIEW_RATE_LIMITER";
  const limited = await requireRateLimit(c, name);
  if (limited) return limited;
  await next();
};
