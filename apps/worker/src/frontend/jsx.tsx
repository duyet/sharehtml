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

/** Clerk script tags to inject in <head> when AUTH_MODE === "clerk". */
export function ClerkScripts({ publishableKey }: { publishableKey: string }): JSX.Element {
  const cdn = clerkCdnUrl(publishableKey);
  return (
    <>
      <script>
        {raw(`window.__CLERK_PUBLISHABLE_KEY__=${safeJsonForScript(publishableKey)};`)}
      </script>
      <script defer src={`${cdn}/npm/@clerk/ui@1/dist/ui.browser.js`}></script>
      <script defer data-clerk-publishable-key={publishableKey} src={`${cdn}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`}></script>
    </>
  );
}
