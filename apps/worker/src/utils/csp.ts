export type CspOptions = {
  clerkPublishableKey?: string;
  hasFrame?: boolean;
};

function buildCspPolicy(options: CspOptions): string[] {
  const dirs: string[] = [];
  dirs.push("default-src 'self'");

  const scripts = ["'self'", "'unsafe-inline'", "https://static.cloudflareinsights.com", "https://cdn.jsdelivr.net"];
  // Clerk CDN is added by default when using Clerk
  if (options.clerkPublishableKey) {
    scripts.push("https://cdn.jsdelivr.net");
  }
  dirs.push(`script-src ${scripts.join(" ")}`);

  const styles = ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"];
  dirs.push(`style-src ${styles.join(" ")}`);

  dirs.push("font-src 'self' https://fonts.gstatic.com");

  const connects = ["'self'", "wss:", "https://cdn.jsdelivr.net"];
  // Clerk Frontend API (if using custom domain, this should be added separately)
  if (options.clerkPublishableKey) {
    // Note: Using Clerk CDN, so connect to Clerk's API servers
    connects.push("https://clerk.com");
  }
  dirs.push(`connect-src ${connects.join(" ")}`);

  dirs.push("img-src 'self' data:");

  if (options.hasFrame) {
    dirs.push("frame-src 'self'");
  }

  const workers = ["'self'", "blob:"];
  dirs.push(`worker-src ${workers.join(" ")}`);

  return dirs;
}

export function cspHeader(options: CspOptions): string {
  return buildCspPolicy(options).join("; ");
}

