/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { raw } from "hono/utils/html";
import type { AssetUrls } from "../utils/assets.js";
import { formatDocumentSize, formatRelativeTime } from "../utils/home-view.js";
import type { AuthMode, DocumentRow, RecentViewRow } from "../types.js";
import { toHtml, safeJsonForScript, ClerkScripts } from "./jsx.js";

interface HomeParams {
  assets: AssetUrls;
  email: string;
  workerUrl: string;
  documents: DocumentRow[];
  recentViews: RecentViewRow[];
  page: number;
  pageSize: number;
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

function SetupBlock({ workerUrl, requiresLogin }: SetupBlockProps): JSX.Element {
  return (
    <div class="setup-block">
      <p>
        Deploy HTML, Markdown, or code files instantly with the{" "}
        <a href="https://github.com/duyet/sharehtml">sharehtml CLI</a>.
      </p>
      <pre>
        {raw(`<span class="cmd-comment"># deploy a file (defaults to ${workerUrl})</span>\n`)}
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
        <div class="topbar">
          <a class="topbar-home" href="/">
            sharehtml
          </a>
          <div class="topbar-right">
            <span class="topbar-email">{email}</span>
          </div>
        </div>
        
        <div class="content">
          <div class="hero">
            <h1>Deploy your ideas instantly.</h1>
            <p>
              Built for AI Agents. A simple, editorial platform for sharing HTML reports, Markdown notes, 
              and code snippets with the world.
            </p>
            <a href="https://github.com/duyet/sharehtml" class="btn-primary">
              View on GitHub
            </a>
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
            </div>
          )}
        </div>

        <script>
          {raw(
            `window.__HOME_CONFIG__ = ${safeJsonForScript({
              page,
              pageSize,
              homeCapabilityToken,
            })}`,
          )}
        </script>
        {assets.homeClientJs && <script type="module" src={assets.homeClientJs}></script>}
      </body>
    </html>
  );
  return toHtml(jsx);
}
