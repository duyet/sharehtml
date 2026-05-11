export type CspOptions = {
  clerkPublishableKey?: string;
  hasFrame?: boolean;
};

function clerkOrigin(publishableKey: string): string {
  const encoded = publishableKey.replace(/^pk_(live|test)_/, "");
  const fqdn = atob(encoded).replace(/\$+$/, "");
  return `https://${fqdn}`;
}

function buildCspPolicy(options: CspOptions): string[] {
  const dirs: string[] = [];
  dirs.push("default-src 'self'");

  const scripts = ["'self'", "'unsafe-inline'", "https://static.cloudflareinsights.com"];
  if (options.clerkPublishableKey) {
    scripts.push(clerkOrigin(options.clerkPublishableKey));
  }
  dirs.push(`script-src ${scripts.join(" ")}`);

  const styles = ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"];
  dirs.push(`style-src ${styles.join(" ")}`);

  dirs.push("font-src 'self' https://fonts.gstatic.com");

  const connects = ["'self'", "wss:"];
  if (options.clerkPublishableKey) {
    connects.push(clerkOrigin(options.clerkPublishableKey));
  }
  dirs.push(`connect-src ${connects.join(" ")}`);

  dirs.push("img-src 'self' data:");

  if (options.hasFrame) {
    dirs.push("frame-src 'self'");
  }

  // Allow workers from blob: URLs (needed for Clerk SDK)
  dirs.push("worker-src 'self' blob:");

  return dirs;
}

export function cspHeader(options: CspOptions): string {
  return buildCspPolicy(options).join("; ");
}

