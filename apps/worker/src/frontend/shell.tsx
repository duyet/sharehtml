/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { raw } from "hono/utils/html";
import type { AssetUrls } from "../utils/assets.js";
import type { AuthMode } from "../types.js";
import { isAuthEnabled } from "../types.js";
import { toHtml, escapeScriptContent, safeJsonForScript, ClerkScripts } from "./jsx.js";

interface ShellParams {
  docId: string;
  title: string;
  ownerEmail: string;
  email: string;
  authMode: AuthMode;
  assets: AssetUrls;
  viewerCapabilityToken: string;
  clerkPublishableKey?: string;
}

export function ShellView(
  {
    docId,
    title,
    ownerEmail,
    email,
    authMode,
    assets,
    viewerCapabilityToken,
    clerkPublishableKey,
    cfBeaconToken,
  }: ShellParams & { cfBeaconToken?: string },
) {
  const jsx = (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title} — sharehtml</title>
        <meta property="og:title" content={title} />
        <meta property="og:type" content="website" />
        <meta name="robots" content="all" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        {assets.shellClientCss && <link rel="stylesheet" href={assets.shellClientCss} />}
        {cfBeaconToken && (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token": "${cfBeaconToken}"}`}
          ></script>
        )}
        {authMode === "clerk" && clerkPublishableKey && <ClerkScripts publishableKey={clerkPublishableKey} />}
        <script>
          {raw(escapeScriptContent(
            `if(localStorage.getItem('comment_sidebar_${docId}')==='collapsed'){document.documentElement.classList.add('sidebar-start-collapsed')}`,
          ))}
        </script>
        <style>
          {raw(`.sidebar-start-collapsed .sidebar{width:0;border-left:none;overflow:hidden}`)}
        </style>
      </head>
      <body>
        <header class="topbar">
          <a class="topbar-home" href="/">
            sharehtml
          </a>
          <div class="topbar-title-wrapper">
            <div class="topbar-title">{title}</div>
            <div class="topbar-title-tooltip">
              <div class="topbar-title-tooltip-label">created by</div>
              <div class="topbar-title-tooltip-email">{ownerEmail}</div>
            </div>
          </div>
          <div class="topbar-right">
            {isAuthEnabled(authMode) && email && email !== "unauthenticated@clerk" ? (
              <a class="topbar-link" href="/dashboard" title="Dashboard">dashboard</a>
            ) : isAuthEnabled(authMode) ? (
              <a class="topbar-link" href="/login" title="Sign in">sign in</a>
            ) : null}
            <a class="topbar-link" href="/docs" title="Documentation">
              docs
            </a>
            <a class="topbar-link" href={`/d/${docId}.html`} title="View raw HTML">
              raw
            </a>
            <div class="export-menu">
              <button class="topbar-link" id="export-md" aria-label="Export as Markdown">md</button>
              <button class="topbar-link" id="export-json" aria-label="Export as JSON">json</button>
            </div>
            <div class="presence-dots" id="presence-dots"></div>
            {authMode === "clerk" && clerkPublishableKey && (
              <div id="clerk-user-btn"></div>
            )}
            <button class="sidebar-toggle" id="sidebar-toggle" aria-label="Toggle comments sidebar">
              <span class="sidebar-toggle-text">comments</span>
              {raw(
                `<svg class="sidebar-toggle-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
              )}
            </button>
          </div>
        </header>

        <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
        <div class="main">
          <div class="iframe-container">
            <iframe
              id="doc-iframe"
              sandbox=""
              allow="fullscreen"
              allowFullScreen
            ></iframe>
          </div>
          <div class="sidebar" id="sidebar">
            <div class="sidebar-header">
              <span id="comment-count">0 comments</span>
              <button class="filter-toggle" id="filter-resolved" title="Show resolved" aria-label="Toggle resolved comments">
                resolved
              </button>
            </div>
            <div class="sidebar-content" id="sidebar-content">
              <div class="sidebar-empty">select text in the document to add a comment</div>
            </div>
          </div>
        </div>

        <script>
          {raw(
            `window.__COMMENT_CONFIG__ = ${safeJsonForScript({
              docId,
              email,
              authMode,
              contentPath: `/d/${docId}/content`,
              viewerCapabilityToken,
              clerkPublishableKey: authMode === "clerk" ? clerkPublishableKey : undefined,
            })}`,
          )}
        </script>
        <script type="module" src={assets.shellClientJs}></script>
      </body>
    </html>
  );
  return toHtml(jsx);
}
