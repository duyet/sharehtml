/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { raw } from "hono/utils/html";
import type { AssetUrls } from "../utils/assets.js";
import { formatDocumentSize, formatRelativeTime } from "../utils/home-view.js";
import type { AuthMode, DocumentRow, ShareMode } from "../types.js";
import { toHtml, safeJsonForScript, ClerkScripts } from "./jsx.js";

interface TagParams {
  assets: AssetUrls;
  email: string;
  workerUrl: string;
  tag: string;
  documents: DocumentRow[];
  totalCount: number;
  homeCapabilityToken: string;
  authMode: AuthMode;
  clerkPublishableKey?: string;
  cfBeaconToken?: string;
}

function shareModeBadge(mode: number): { label: string; cls: string } {
  if (mode === 1) return { label: "link", cls: "badge-link" };
  if (mode === 2) return { label: "email", cls: "badge-email" };
  return { label: "private", cls: "badge-private" };
}

export function TagView({
  assets,
  email,
  workerUrl,
  tag,
  documents,
  totalCount,
  homeCapabilityToken,
  authMode,
  clerkPublishableKey,
  cfBeaconToken,
}: TagParams): string {
  const isClerk = authMode === "clerk";
  const jsx = (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Tag: {tag} - sharehtml</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        {assets.dashboardCss && <link rel="stylesheet" href={assets.dashboardCss} />}
        {cfBeaconToken && (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token": "${cfBeaconToken}"}`}
          ></script>
        )}
        {authMode === "clerk" && clerkPublishableKey && <ClerkScripts publishableKey={clerkPublishableKey} />}
      </head>
      <body>
        <header class="topbar">
          <a class="topbar-home" href="/">
            sharehtml
          </a>
          <nav class="topbar-right">
            <a class="topbar-link" href="/dashboard">Dashboard</a>
            <a class="topbar-link" href="/docs">Docs</a>
            {isClerk
              ? <div id="clerk-user-btn"></div>
              : <span class="topbar-email">{email}</span>}
          </nav>
        </header>

        <main class="dashboard-content">
          <div class="dashboard-header">
            <div class="dashboard-header-left">
              <h1 class="dashboard-title">
                <span class="tag-badge">#{tag}</span>
              </h1>
              <span class="dashboard-count" id="doc-count">
                {totalCount} document{totalCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div class="doc-grid" id="doc-grid">
            {documents.map((doc) => {
              const badge = shareModeBadge(doc.is_shared);
              return (
                <article class="doc-grid-card" data-doc-id={doc.id}>
                  <div class="doc-grid-preview">
                    <iframe
                      class="doc-grid-iframe"
                      sandbox="allow-scripts"
                      loading="lazy"
                      data-preview-src={`/d/${doc.id}.html`}
                    ></iframe>
                  </div>
                  <div class="doc-grid-info">
                    <div class="doc-grid-top">
                      <a class="doc-grid-card-title" href={`/d/${doc.id}`}>{doc.title}</a>
                      <span class="doc-grid-filename">{doc.filename}</span>
                    </div>
                    <div class="doc-grid-meta">
                      <span>{formatDocumentSize(doc.size)}</span>
                      <span>{formatRelativeTime(doc.created_at)}</span>
                      <span class={`share-badge ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <div class="doc-grid-actions">
                      <a class="doc-grid-btn doc-grid-btn-view" href={`/d/${doc.id}`}>
                        view
                      </a>
                      <button class="doc-grid-btn doc-grid-btn-delete" data-doc-id={doc.id}>
                        delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {documents.length === 0 && (
            <div class="dashboard-empty">
              <p>No documents with tag <strong>#{tag}</strong>.</p>
              <p>Add tags to documents using the CLI:</p>
              <pre>npx -y @duyet/sharehtml tag add &lt;doc-id&gt; {tag}</pre>
            </div>
          )}
        </main>

        <div class="modal-backdrop hidden" id="delete-modal">
          <div class="modal-content">
            <div class="modal-title">Delete document?</div>
            <p class="modal-description" id="delete-modal-desc">
              This action cannot be undone.
            </p>
            <div class="modal-actions">
              <button class="modal-submit" id="delete-confirm-btn">Delete</button>
              <button class="modal-cancel" id="delete-cancel-btn">Cancel</button>
            </div>
          </div>
        </div>

        <script>
          {raw(
            `window.__DASHBOARD_CONFIG__ = ${safeJsonForScript({
              homeCapabilityToken,
              authMode,
              clerkPublishableKey: isClerk ? clerkPublishableKey : undefined,
            })}`,
          )}
        </script>
        {assets.dashboardClientJs && <script type="module" src={assets.dashboardClientJs}></script>}
      </body>
    </html>
  );
  return toHtml(jsx);
}
