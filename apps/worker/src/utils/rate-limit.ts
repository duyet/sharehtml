export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Clean stale entries every 60s
let lastCleanup = Date.now();
function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) {
      buckets.delete(key);
    }
  }
}

export function rateLimitKey(c: { req: { header: (name: string) => string | undefined } }): string {
  return c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For") || "unknown";
}

export function checkRateLimit(key: string, config: RateLimitConfig): { allowed: boolean; retryAfter: number } {
  cleanup();
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + config.windowMs };
    buckets.set(key, bucket);
  }
  bucket.count++;
  if (bucket.count > config.maxRequests) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }
  return { allowed: true, retryAfter: 0 };
}
