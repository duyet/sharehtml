/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { raw } from "hono/utils/html";
import type { HtmlEscapedString } from "hono/utils/html";

export function SetupBlock({ workerUrl }: { workerUrl: string }): JSX.Element {
  return (
    <div class="setup-block">
      <div class="methods-grid">
        <div class="method-card">
          <div class="method-label">CLI — file path</div>
          <pre>{raw(`<span class="cmd-comment"># deploy a file (defaults to ${workerUrl})</span>\nnpx -y @duyet/sharehtml@latest deploy file.html`)}</pre>
        </div>
        <div class="method-card">
          <div class="method-label">CLI — stdin pipe</div>
          <pre>cat file.html | npx -y @duyet/sharehtml@latest deploy -</pre>
        </div>
        <div class="method-card">
          <div class="method-label">HTTP — curl API</div>
          <pre>curl -X POST {workerUrl}/api/documents -F "file=@report.html"</pre>
        </div>
      </div>

      <p class="setup-skills-label">
        Add <b>sharehtml skills</b> to your AI Agent (Claude Code, etc.):
      </p>
      <pre>
        npx -y skills@latest add duyet/sharehtml
      </pre>

      <p class="setup-skills-label">
        Or copy &amp; paste this prompt to your AI Agent (Cursor, Windsurf, Claude, etc.):
      </p>
      <pre>
        Deploy this to the web using sharehtml:
        {"`"}npx -y @duyet/sharehtml@latest deploy path/to/file.html{"`"}
      </pre>
    </div>
  );
}

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
