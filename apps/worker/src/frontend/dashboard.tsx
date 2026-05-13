/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { raw } from "hono/utils/html";
import type { AuthMode, DocumentRow } from "../types.js";
import type { AssetUrls } from "../utils/assets.js";
import { formatDocumentSize, formatRelativeTime } from "../utils/home-view.js";
import { ClerkScripts, safeJsonForScript, toHtml } from "./jsx.js";

interface DashboardParams {
  assets: AssetUrls;
  email: string;
  workerUrl: string;
  documents: DocumentRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  homeCapabilityToken: string;
  authMode: AuthMode;
  clerkPublishableKey?: string;
  cfBeaconToken?: string;
  requiresAuth?: boolean;
}

function shareModeBadge(mode: number): { label: string; cls: string } {
  if (mode === 1) return { label: "link", cls: "badge-link" };
  if (mode === 2) return { label: "email", cls: "badge-email" };
  return { label: "private", cls: "badge-private" };
}

export function DashboardView({
  assets,
  email,
  documents,
  page,
  pageSize,
  totalCount,
  homeCapabilityToken,
  authMode,
  clerkPublishableKey,
  cfBeaconToken,
  requiresAuth = false,
}: DashboardParams): string {
  const isClerk = authMode === "clerk";
  const jsx = (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Dashboard - sharehtml</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        {assets.dashboardCss && <link rel="stylesheet" href={assets.dashboardCss} />}
        {cfBeaconToken && (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token": "${cfBeaconToken}"}`}
          ></script>
        )}
        {authMode === "clerk" && clerkPublishableKey && (
          <ClerkScripts publishableKey={clerkPublishableKey} />
        )}
      </head>
      <body>
        <header class="topbar">
          <a class="topbar-home" href="/">
            sharehtml
          </a>
          <nav class="topbar-right">
            <a class="topbar-link" href="/docs">
              Docs
            </a>
            {isClerk ? (
              <div class="clerk-topbar" id="clerk-topbar" data-state="loading"></div>
            ) : (
              <span class="topbar-email">{email}</span>
            )}
          </nav>
        </header>

        <main class="dashboard-content">
          <div class="dashboard-header">
            <div>
              <div class="dashboard-eyebrow">Dashboard</div>
              <h1 class="dashboard-title">My Documents</h1>
            </div>
            <div class="dashboard-header-actions">
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
                      <a class="doc-grid-card-title" href={`/d/${doc.id}`}>
                        {doc.title}
                      </a>
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
              <div class="dashboard-empty-icon">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 48 48"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="8"
                    y="6"
                    width="32"
                    height="36"
                    rx="4"
                    stroke="var(--g300)"
                    stroke-width="2"
                    fill="none"
                  />
                  <line
                    x1="14"
                    y1="16"
                    x2="34"
                    y2="16"
                    stroke="var(--g300)"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                  <line
                    x1="14"
                    y1="24"
                    x2="28"
                    y2="24"
                    stroke="var(--g300)"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                  <line
                    x1="14"
                    y1="32"
                    x2="22"
                    y2="32"
                    stroke="var(--g300)"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
              </div>
              <p class="dashboard-empty-title">No documents yet</p>
              <p class="dashboard-empty-desc">
                Deploy your first document using the CLI, curl API, or sharehtml skills for your AI
                agent.
              </p>
              <div class="dashboard-empty-actions">
                <a href="/docs" class="btn-primary">
                  Read the Docs
                </a>
              </div>
            </div>
          )}

          <div class="doc-grid-pagination" id="doc-grid-pagination"></div>

          <div class="dashboard-section">
            <div class="section-label">API Keys</div>
            <div class="api-keys-panel" id="api-keys-panel">
              <div class="api-keys-empty" id="api-keys-empty">
                <p>API keys allow programmatic access to deploy documents.</p>
                <button class="btn-primary btn-sm" id="create-api-key-btn">
                  Create API Key
                </button>
              </div>
              <div class="api-keys-list" id="api-keys-list"></div>
            </div>
          </div>
        </main>

        <div class="modal-backdrop hidden" id="delete-modal">
          <div class="modal-content">
            <div class="modal-title">Delete document?</div>
            <p class="modal-description" id="delete-modal-desc">
              This action cannot be undone.
            </p>
            <div class="modal-actions">
              <button class="modal-submit" id="delete-confirm-btn">
                Delete
              </button>
              <button class="modal-cancel" id="delete-cancel-btn">
                Cancel
              </button>
            </div>
          </div>
        </div>

        <div class="modal-backdrop hidden" id="api-key-modal">
          <div class="modal-content">
            <div class="modal-title">API Key Created</div>
            <p class="modal-description">Copy this key now. It will not be shown again.</p>
            <div class="api-key-display">
              <code id="api-key-value"></code>
              <button class="modal-submit" id="api-key-copy-btn">
                Copy
              </button>
            </div>
            <button class="modal-cancel" id="api-key-close-btn">
              Close
            </button>
          </div>
        </div>

        <script>
          {raw(
            `window.__DASHBOARD_CONFIG__ = ${safeJsonForScript({
              page,
              pageSize,
              totalCount,
              homeCapabilityToken,
              authMode,
              clerkPublishableKey: isClerk ? clerkPublishableKey : undefined,
              requiresAuth,
            })}`,
          )}
        </script>
        {assets.dashboardClientJs && <script type="module" src={assets.dashboardClientJs}></script>}
      </body>
    </html>
  );
  return toHtml(jsx);
}
