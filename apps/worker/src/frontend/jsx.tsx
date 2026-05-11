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

/**
 * Clerk SDK script tags following the official JavaScript CDN quickstart.
 * Loads @clerk/ui (renders prebuilt components) and @clerk/clerk-js (core SDK)
 * from the project's Frontend API host. The `data-clerk-publishable-key` attribute
 * on clerk.browser.js auto-instantiates `window.Clerk` so the client never needs
 * `new Clerk(key)`.
 */
export function ClerkScripts({ publishableKey }: { publishableKey: string }): JSX.Element {
  const fapi = clerkCdnUrl(publishableKey);
  return (
    <>
      <script
        defer
        crossOrigin="anonymous"
        src={`${fapi}/npm/@clerk/ui@1/dist/ui.browser.js`}
      ></script>
      <script
        defer
        crossOrigin="anonymous"
        data-clerk-publishable-key={publishableKey}
        src={`${fapi}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`}
      ></script>
    </>
  );
}
