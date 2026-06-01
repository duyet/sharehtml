/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { raw } from "hono/utils/html";
import type { AssetUrls } from "../utils/assets.js";
import { formatDocumentSize, formatBytes, formatRelativeTime, buildHomePath } from "../utils/home-view.js";
import { isAuthEnabled, type AuthMode, type DocumentRow, type RecentViewRow, type HomeAnalytics } from "../types.js";
import { toHtml, safeJsonForScript, ClerkScripts, SetupBlock } from "./jsx.js";

interface HomeParams {
  assets: AssetUrls;
  email: string;
  workerUrl: string;
  documents: DocumentRow[];
  recentViews: RecentViewRow[];
  analytics: HomeAnalytics;
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

// Fill missing days so the chart shows a continuous 30-day UTC axis ending today.
// SQL returns only days with >=1 upload; gap-filling happens here per design.
function buildUploadSeries(uploadsPerDay: HomeAnalytics["uploadsPerDay"]): Array<{ date: string; count: number }> {
  const counts = new Map(uploadsPerDay.map((d) => [d.date, d.count]));
  const series: Array<{ date: string; count: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    series.push({ date, count: counts.get(date) || 0 });
  }
  return series;
}

interface AnalyticsSectionProps {
  analytics: HomeAnalytics;
}

function AnalyticsSection({ analytics }: AnalyticsSectionProps): JSX.Element {
  const series = buildUploadSeries(analytics.uploadsPerDay);
  const maxCount = Math.max(1, ...series.map((d) => d.count));
  const firstDate = series[0].date;
  const lastDate = series[series.length - 1].date;

  return (
    <div class="section">
      <div class="section-label">Analytics</div>
      <div class="analytics-card">
        <div class="stats-band">
          <div class="stat-cell">
            <div class="stat-value">{analytics.totalDocs}</div>
            <div class="stat-label">Total uploads</div>
          </div>
          <div class="stat-cell">
            <div class="stat-value">{analytics.todayUploads}</div>
            <div class="stat-label">Uploaded today</div>
          </div>
          <div class="stat-cell">
            <div class="stat-value">{analytics.totalViews}</div>
            <div class="stat-label">Page views</div>
          </div>
          <div class="stat-cell">
            <div class="stat-value">{analytics.totalUsers}</div>
            <div class="stat-label">Users</div>
          </div>
          <div class="stat-cell">
            <div class="stat-value">{formatBytes(analytics.totalStorage)}</div>
            <div class="stat-label">Storage used</div>
          </div>
          <div class="stat-cell">
            <div class="stat-value">{analytics.todayViews}</div>
            <div class="stat-label">Docs viewed today</div>
          </div>
        </div>
        <div class="chart">
          <div class="chart-bars">
            {series.map((d) => (
              <div
                class="chart-bar"
                style={`height:${Math.round((d.count / maxCount) * 100)}%`}
                title={`${d.date}: ${d.count}`}
              ></div>
            ))}
          </div>
          <div class="chart-axis">
            <span>{firstDate}</span>
            <span>{lastDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomeView({
  assets,
  email,
  workerUrl,
  documents,
  recentViews,
  analytics,
  page,
  pageSize,
  totalCount,
  query,
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
              <div class="clerk-topbar" id="clerk-topbar" data-state="loading"></div>
            ) : isAuthEnabled(authMode) ? (
              <a class="topbar-link" href="/login">Sign in</a>
            ) : (
              <span class="topbar-email">{email}</span>
            )}
          </div>
</header>

          <div class="content">
          <div class="hero">
            <div class="eyebrow">AI Agent Publishing Platform</div>
            <h1>
              Deploy files <em>instantly</em> with sharehtml
            </h1>
            <div class="tldr">
              <b>TL;DR</b> — Three ways to publish: CLI file path, stdin pipe, or curl API.
              No signup needed. Documents persist indefinitely. Built for AI agents and developers.
            </div>
            <div class="hero-actions">
              <a href="/docs" class="btn-primary">Read the Docs</a>
              <a href="https://github.com/duyet/sharehtml" class="btn-secondary">View on GitHub</a>
            </div>
          </div>

          <div class="section">
            <div class="section-label">Quick Start</div>
            <SetupBlock workerUrl={workerUrl} />
          </div>

          <AnalyticsSection analytics={analytics} />

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
