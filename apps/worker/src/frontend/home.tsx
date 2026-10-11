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
  formatDocumentKind,
  formatDocumentSize,
  formatRelativeTime,
} from "../utils/home-view.js";
import { ClerkScripts, PaperFonts, SetupBlock, safeJsonForScript, toHtml } from "./jsx.js";

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
    <a class="doc-card" href={`/d/${doc.id}.html`} rel="nofollow">
      <div class="doc-card-top">
        <span class="kind-badge">{formatDocumentKind(doc.source_kind)}</span>
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
    <a class="recent-card" href={`/d/${doc.id}.html`} rel="nofollow">
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

type CalendarDay = HomeAnalytics["calendar"][number];

// Bucket a count into 0-4 relative to the series max.
function calendarLevel(count: number, max: number): number {
  if (count <= 0 || max <= 0) return 0;
  return Math.min(4, Math.ceil((count / max) * 4));
}

function CalendarGrid({
  days,
  metric,
  className,
}: {
  days: CalendarDay[];
  metric: "uploads" | "views";
  className: string;
}): JSX.Element {
  const max = Math.max(0, ...days.map((d) => d[metric]));
  const startDow = new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
  const months = days.map((d, i) => {
    const month = d.date.slice(5, 7);
    const prev = i === 0 ? "" : days[i - 1].date.slice(5, 7);
    return month === prev ? "" : d.date.slice(0, 7);
  });
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return (
    <div class={`calendar-grid ${className}`}>
      <div class="calendar-months">
        {days.map((d, i) =>
          months[i] ? (
            <span style={`grid-column:${Math.floor((i + startDow) / 7) + 1}`}>
              {names[Number(d.date.slice(5, 7)) - 1]}
            </span>
          ) : null,
        )}
      </div>
      <div class="calendar-cells">
        {days.map((d, i) => (
          <div
            class={`calendar-cell calendar-level-${calendarLevel(d[metric], max)}`}
            style={i === 0 ? `grid-row:${startDow + 1}` : undefined}
            title={`${d.date} · ${d[metric]} ${metric === "uploads" ? (d[metric] === 1 ? "upload" : "uploads") : d[metric] === 1 ? "view" : "views"}`}
          ></div>
        ))}
      </div>
    </div>
  );
}

function CalendarHeatmap({ days }: { days: CalendarDay[] }): JSX.Element {
  return (
    <div class="calendar">
      <input type="radio" name="calendar-metric" id="calendar-uploads" class="calendar-radio" checked />
      <input type="radio" name="calendar-metric" id="calendar-views" class="calendar-radio" />
      <div class="calendar-head">
        <div class="chart-caption">Activity — last 12 months</div>
        <div class="calendar-toggle">
          <label for="calendar-uploads">Uploads</label>
          <label for="calendar-views">Views</label>
        </div>
      </div>
      <CalendarGrid days={days} metric="uploads" className="calendar-grid-uploads" />
      <CalendarGrid days={days} metric="views" className="calendar-grid-views" />
      <div class="calendar-legend">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span class={`calendar-cell calendar-level-${l}`}></span>
        ))}
        <span>More</span>
      </div>
      <div class="calendar-note">
        Uploads are counted from existing documents. Views are counted from the release date of
        this feature.
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
        <CalendarHeatmap days={analytics.calendar} />
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
        <meta name="robots" content="noindex, nofollow" />
        <title>sharehtml</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <PaperFonts />
        <link rel="alternate" type="text/markdown" href="/llms.txt" title="Agent guide" />
        <meta
          name="description"
          content="Publish HTML, Markdown, or code and get a shareable link. AI agents: read /llms.txt for the CLI and REST API."
        />
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
