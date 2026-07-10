/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { raw } from "hono/utils/html";
import {
  type AuthMode,
  type DocumentRow,
  type HomeAnalytics,
  isAuthEnabled,
  type RecentViewRow,
} from "../types.js";
import type { AssetUrls } from "../utils/assets.js";
import {
  buildHomePath,
  formatBytes,
  formatDocumentSize,
  formatRelativeTime,
} from "../utils/home-view.js";
import { ClerkScripts, SetupBlock, safeJsonForScript, toHtml } from "./jsx.js";

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
  isAuthenticated: boolean;
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

interface AnalyticsSectionProps {
  analytics: HomeAnalytics;
}

// Fill missing days so a chart series shows a continuous 30-day UTC axis ending today.
function buildSeries(
  perDay: Array<{ date: string; count: number }>,
): Array<{ date: string; count: number }> {
  const counts = new Map(perDay.map((d) => [d.date, d.count]));
  const series: Array<{ date: string; count: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    series.push({ date, count: counts.get(date) || 0 });
  }
  return series;
}

function Chart({
  series,
  firstDate,
  lastDate,
}: {
  series: Array<{ date: string; count: number }>;
  firstDate: string;
  lastDate: string;
}): JSX.Element {
  const maxCount = Math.max(1, ...series.map((d) => d.count));
  return (
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
  );
}

function AnalyticsSection({ analytics }: AnalyticsSectionProps): JSX.Element {
  const metrics = [
    { value: analytics.totalDocs, label: "Total uploads" },
    { value: analytics.todayUploads, label: "Uploaded today" },
    { value: analytics.totalViews, label: "Page views" },
    ...(analytics.totalUsers === null ? [] : [{ value: analytics.totalUsers, label: "Users" }]),
    ...(analytics.totalStorage === null
      ? []
      : [{ value: formatBytes(analytics.totalStorage), label: "Storage used" }]),
    { value: analytics.todayViews, label: "Docs viewed today" },
    { value: analytics.sharedDocs, label: "Shared docs" },
    { value: analytics.avgViewsPerDoc, label: "Avg views/doc" },
  ];
  const uploadSeries = buildSeries(analytics.uploadsPerDay);
  const viewSeries = buildSeries(analytics.viewsPerDay);

  return (
    <div class="section">
      <div class="section-label">Analytics</div>
      <div class="analytics-card">
        <div class="stats-band" style={`grid-template-columns:repeat(${metrics.length},1fr)`}>
          {metrics.map((metric) => (
            <div class="stat-cell">
              <div class="stat-value">{metric.value}</div>
              <div class="stat-label">{metric.label}</div>
            </div>
          ))}
        </div>
        <div class="chart-group">
          <div class="chart-block">
            <div class="chart-caption">Uploads — last 30 days</div>
            <Chart
              series={uploadSeries}
              firstDate={uploadSeries[0].date}
              lastDate={uploadSeries[uploadSeries.length - 1].date}
            />
          </div>
          <div class="chart-block">
            <div class="chart-caption">Views — last 30 days</div>
            <Chart
              series={viewSeries}
              firstDate={viewSeries[0].date}
              lastDate={viewSeries[viewSeries.length - 1].date}
            />
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
  isAuthenticated,
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
        {authMode === "clerk" && clerkPublishableKey && (
          <ClerkScripts publishableKey={clerkPublishableKey} />
        )}
      </head>
      <body>
        <header class="topbar">
          <a class="topbar-home" href="/">
            sharehtml
          </a>
          <div class="topbar-right">
            <a class="topbar-link" href="/docs">
              Docs
            </a>
            {isClerk && clerkPublishableKey ? (
              <div class="clerk-topbar" id="clerk-topbar" data-state="loading"></div>
            ) : isAuthEnabled(authMode) ? (
              <a class="topbar-link" href="/login">
                Sign in
              </a>
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
              <b>TL;DR</b> — Three ways to publish: CLI file path, stdin pipe, or curl API. No
              signup needed. Documents persist indefinitely. Built for AI agents and developers.
            </div>
            <div class="hero-actions">
              <a href="/docs" class="btn-primary">
                Read the Docs
              </a>
              <a href="https://github.com/duyet/sharehtml" class="btn-secondary">
                View on GitHub
              </a>
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
                {recentViews.map((d) => (
                  <RecentDocCard doc={d} />
                ))}
              </div>
            </div>
          )}

          {documents.length > 0 && (
            <div class="section">
              <div class="section-label">
                {isAuthenticated ? "Recently Added" : "Shared Public Documents"}
              </div>
              <div class="doc-list">
                {documents.map((d) => (
                  <DocCard doc={d} subtitle={formatDocumentSize(d.size)} />
                ))}
              </div>
              {isAuthenticated && (
                <Pagination page={page} pageSize={pageSize} totalCount={totalCount} query={query} />
              )}
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
