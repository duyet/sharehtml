/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { raw } from "hono/utils/html";
import type { AssetUrls } from "../utils/assets.js";
import { formatDocumentSize, formatRelativeTime, buildHomePath } from "../utils/home-view.js";
import { isAuthEnabled, type AuthMode, type DocumentRow, type RecentViewRow } from "../types.js";
import { toHtml, safeJsonForScript, ClerkScripts } from "./jsx.js";

interface HomeParams {
  assets: AssetUrls;
  email: string;
  workerUrl: string;
  documents: DocumentRow[];
  recentViews: RecentViewRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  query: string;
  requiresLogin: boolean;
  homeCapabilityToken: string;
  authMode: AuthMode;
  clerkPublishableKey?: string;
}

interface DocCardProps {
  doc: DocumentRow;
  subtitle: string;
}

interface RecentDocCardProps {
  doc: RecentViewRow;
}

interface SetupBlockProps {
  workerUrl: string;
  requiresLogin: boolean;
}

function DocCard({ doc, subtitle }: DocCardProps): JSX.Element {
  return (
    <a class="doc-card" href={`/d/${doc.id}.html`}>
      <div class="doc-card-top">
        <span class="doc-card-title">{doc.title}</span>
        <span class="doc-card-filename">{doc.filename}</span>
      </div>
      <div class="doc-card-meta">
        {subtitle} • {formatRelativeTime(doc.created_at)}
      </div>
    </a>
  );
}

function RecentDocCard({ doc }: RecentDocCardProps): JSX.Element {
  const viewedAt = doc.last_viewed_at || doc.created_at;

  return (
    <a class="recent-card" href={`/d/${doc.id}.html`}>
      <div class="recent-card-title">{doc.title}</div>
      <div class="recent-card-filename">{doc.filename}</div>
      <div class="recent-card-meta">viewed {formatRelativeTime(viewedAt)}</div>
    </a>
  );
}

interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  query: string;
}

function Pagination({ page, pageSize, totalCount, query }: PaginationProps): JSX.Element | null {
  if (totalCount <= pageSize) return null;

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div class="pagination">
      <a
        class={`pagination-link${page <= 1 ? " disabled" : ""}`}
        href={buildHomePath(query, page - 1)}
      >
        ← Previous
      </a>
      <span class="pagination-info">
        Page {page} of {totalPages}
      </span>
      <a
        class={`pagination-link${page >= totalPages ? " disabled" : ""}`}
        href={buildHomePath(query, page + 1)}
      >
        Next →
      </a>
    </div>
  );
}

function SetupBlock({ workerUrl, requiresLogin }: SetupBlockProps): JSX.Element {
  return (
    <div class="setup-block">
      <p>
        Deploy HTML, Markdown, or code files instantly with the{" "}
        <a href="https://github.com/duyet/sharehtml">sharehtml CLI</a>.
      </p>
      <pre>
        {raw(`<span class="cmd-comment"># deploy a file (defaults to ${workerUrl}) — no signup needed</span>\n`)}
        npx -y @duyet/sharehtml@latest deploy path/to/file.html
        {"\n"}
        {requiresLogin ? "npx -y @duyet/sharehtml@latest login\n" : ""}
      </pre>

      <p class="setup-skills-label">
        Add <b>sharehtml skills</b> to your AI Agent (Claude Code, etc.):
      </p>
      <pre>
        npx -y skills@latest add duyet/sharehtml
      </pre>

      <p class="setup-skills-label">
        Or copy & paste this prompt to your AI Agent (Cursor, Windsurf, Claude, etc.):
      </p>
      <pre>
        Deploy this to the web using sharehtml:
        `npx -y @duyet/sharehtml@latest deploy path/to/file.html`
      </pre>
    </div>
  );
}

export function HomeView({
  assets,
  email,
  workerUrl,
  documents,
  recentViews,
  page,
  pageSize,
  requiresLogin,
  homeCapabilityToken,
  authMode,
  clerkPublishableKey,
  cfBeaconToken,
}: HomeParams & { cfBeaconToken?: string }): string {
  const isClerk = authMode === "clerk";
  const jsx = (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>sharehtml</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        {assets.homeCss && <link rel="stylesheet" href={assets.homeCss} />}
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
          <div class="topbar-right">
            <a class="topbar-link" href="/docs">Docs</a>
            {isClerk && clerkPublishableKey ? (
              <div id="clerk-user-btn"></div>
            ) : isAuthEnabled(authMode) ? (
              <a class="topbar-link" href="/login">Sign in</a>
            ) : (
              <span class="topbar-email">{email}</span>
            )}
          </div>
</header>

          <div class="content">
          <div class="hero">
            <div class="eyebrow">Documentation · Platform Overview</div>
            <h1>
              Deploy files instantly with sharehtml
              <span class="no-auth-badge">No account required</span>
            </h1>
            <div class="tldr">
              <b>TL;DR</b> — Deploy HTML, Markdown, or code files in seconds — no signup, no login, no config.
              Documents persist indefinitely. Built for AI agents and developers.
            </div>
            <div class="hero-actions">
              <a href="/docs" class="btn-primary">Read the Docs</a>
              <a href="https://github.com/duyet/sharehtml" class="btn-secondary">View on GitHub</a>
            </div>
          </div>

          <div class="section">
            <div class="section-label">Quick Start</div>
            <SetupBlock workerUrl={workerUrl} requiresLogin={requiresLogin} />
          </div>

          {recentViews.length > 0 && (
            <div class="section">
              <div class="section-label">Recently Viewed</div>
              <div class="recent-grid">
                {recentViews.map((d) => <RecentDocCard doc={d} />)}
              </div>
            </div>
          )}

          {documents.length > 0 && (
            <div class="section">
              <div class="section-label">Recently Added</div>
              <div class="doc-list">
                {documents.map((d) => <DocCard doc={d} subtitle={formatDocumentSize(d.size)} />)}
              </div>
              <Pagination page={page} pageSize={pageSize} totalCount={totalCount} query={query} />
            </div>
          )}
        </div>

        <script>
          {raw(
            `window.__HOME_CONFIG__ = ${safeJsonForScript({
              page,
              pageSize,
              homeCapabilityToken,
              requiresLogin,
              clerkPublishableKey: isClerk ? clerkPublishableKey : undefined,
            })}`,
          )}
        </script>
        {assets.homeClientJs && <script type="module" src={assets.homeClientJs}></script>}
      </body>
    </html>
  );
  return toHtml(jsx);
}
