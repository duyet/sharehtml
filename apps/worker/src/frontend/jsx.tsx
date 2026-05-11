import { raw } from "hono/utils/html";
import type { HtmlEscapedString } from "hono/utils/html";

// Hono JSX.Element = HtmlEscapedString | Promise<HtmlEscapedString>.
// Our views are synchronous, so we narrow out the Promise at runtime.
export function toHtml(jsx: HtmlEscapedString | Promise<HtmlEscapedString>): HtmlEscapedString {
  if (jsx instanceof Promise) {
    throw new Error("Expected synchronous JSX");
  }
  return jsx;
}

// Escape a string for safe embedding inside a <script> tag.
// Prevents </script> injection and HTML comment/CDATA breakouts.
export function escapeScriptContent(str: string): string {
  return str.replace(/<\//g, "<\\/").replace(/<!--/g, "<\\!--");
}

// Escape HTML entities for safe embedding in HTML text content.
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// JSON.stringify + escapeScriptContent for safe inline <script> data.
export function safeJsonForScript(value: unknown): string {
  return escapeScriptContent(JSON.stringify(value));
}

/**
 * Derive the Clerk Frontend API base URL from a publishable key.
 *
 * Clerk publishable keys encode the FQDN in base64 after the `pk_live_` / `pk_test_` prefix.
 * Example: pk_live_Y2xlcmsuaHRtbC5kdXlldC5uZXQk -> clerk.html.duyet.net -> https://clerk.html.duyet.net
 */
export function clerkCdnUrl(publishableKey: string): string {
  const encoded = publishableKey.replace(/^pk_(live|test)_/, "");
  const fqdn = atob(encoded).replace(/\$+$/, "");
  return `https://${fqdn}`;
}

/** Clerk script tag to set publishable key when AUTH_MODE === "clerk". */
export function ClerkScripts({ publishableKey }: { publishableKey: string }): JSX.Element {
  // Load Clerk from CDN (works with any publishable key)
  return (
    <>
      <script
        crossOrigin="anonymous"
        src="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@6.8.0/dist/clerk.browser.js"
        data-clerk-publishable-key={publishableKey}
      ></script>
    </>
  );
}

/** UI renderer script tag for Clerk components */
export function ClerkUIRenderer({ publishableKey }: { publishableKey: string }): JSX.Element {
  // Load Clerk UI from CDN
  return (
    <>
      <script
        defer
        crossOrigin="anonymous"
        src="https://cdn.jsdelivr.net/npm/@clerk/ui@1.7.0/dist/ui.browser.js"
      ></script>
    </>
  );
}
