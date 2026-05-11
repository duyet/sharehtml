export type CspOptions = {
  clerkPublishableKey?: string;
  hasFrame?: boolean;
};

function clerkFapiOrigin(publishableKey: string): string | null {
  const encoded = publishableKey.replace(/^pk_(live|test)_/, "");
  try {
    const fqdn = atob(encoded).replace(/\$+$/, "");
    return fqdn ? `https://${fqdn}` : null;
  } catch {
    return null;
  }
}

function buildCspPolicy(options: CspOptions): string[] {
  const dirs: string[] = [];
  const clerkOrigin = options.clerkPublishableKey ? clerkFapiOrigin(options.clerkPublishableKey) : null;

  dirs.push("default-src 'self'");

  const scripts = [
    "'self'",
    "'unsafe-inline'",
    "https://static.cloudflareinsights.com",
    "https://cdn.jsdelivr.net",
  ];
  if (clerkOrigin) scripts.push(clerkOrigin);
  dirs.push(`script-src ${scripts.join(" ")}`);

  dirs.push("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
  dirs.push("font-src 'self' https://fonts.gstatic.com");

  const connects = ["'self'", "wss:", "https://cdn.jsdelivr.net"];
  if (clerkOrigin) {
    connects.push(clerkOrigin);
    connects.push("https://clerk-telemetry.com");
  }
  dirs.push(`connect-src ${connects.join(" ")}`);

  const imgs = ["'self'", "data:", "https://img.clerk.com"];
  if (clerkOrigin) imgs.push(clerkOrigin);
  dirs.push(`img-src ${imgs.join(" ")}`);

  if (options.hasFrame) {
    dirs.push("frame-src 'self'");
  }

  dirs.push("worker-src 'self' blob:");

  return dirs;
}

export function cspHeader(options: CspOptions): string {
  return buildCspPolicy(options).join("; ");
}
