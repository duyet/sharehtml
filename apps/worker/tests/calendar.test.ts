import { env } from "cloudflare:workers";
import { HomeView } from "../src/frontend/home.js";
import type { AssetUrls } from "../src/utils/assets.js";

function registry(name: string) {
  return env.REGISTRY_DO.get(env.REGISTRY_DO.idFromName(name));
}

const doc = (id: string) => ({
  id,
  title: "T",
  filename: "t.html",
  size: 1,
  owner_email: "o@example.com",
  is_shared: 1,
});

describe("calendar analytics", () => {
  it("returns 53 Sunday-aligned weeks ending today (UTC), public counts only", async () => {
    const analytics = await registry("cal-shape").getHomeAnalytics(false);
    const { calendar } = analytics;
    // Full-width heatmap needs exactly 53 columns: 52 full weeks + the current partial week.
    expect(calendar).toHaveLength(52 * 7 + new Date().getUTCDay() + 1);
    expect(new Date(`${calendar[0].date}T00:00:00Z`).getUTCDay()).toBe(0);
    expect(calendar[calendar.length - 1].date).toBe(new Date().toISOString().slice(0, 10));
    expect(calendar.every((d) => d.uploads === 0 && d.views === 0)).toBe(true);
    expect(analytics.totalUsers).toBeNull();
    expect(analytics.totalStorage).toBeNull();
  });

  it("increments daily_stats on upload and on every view, not just the last view", async () => {
    const reg = registry("cal-incr");
    await reg.createDocument(doc("cal-a"));
    await reg.createDocument(doc("cal-b"));
    await reg.recordView("u@example.com", "cal-a");
    await reg.recordView("u@example.com", "cal-a");
    await reg.recordView("v@example.com", "cal-b");

    const { calendar } = await reg.getHomeAnalytics(false);
    const today = calendar[calendar.length - 1];
    expect(today.uploads).toBe(2);
    // views table collapses repeat views per (user, doc); daily_stats must not.
    expect(today.views).toBe(3);
  });

  it("renders a heatmap with titled cells and the views caveat", () => {
    const assets = { homeCss: "/h.css" } as AssetUrls;
    const calendar = Array.from({ length: 371 }, (_, i) => ({
      date: new Date(Date.UTC(2026, 3, 13) + i * 86400000).toISOString().slice(0, 10),
      uploads: i === 181 ? 3 : 0,
      views: 0,
    }));
    const html = String(
      HomeView({
        assets,
        email: "a@b.c",
        workerUrl: "https://example.com",
        documents: [],
        recentViews: [],
        analytics: {
          totalDocs: 0,
          todayUploads: 0,
          totalViews: 0,
          totalUsers: null,
          totalStorage: null,
          todayViews: 0,
          uploadsPerDay: [],
          viewsPerDay: [],
          calendar,
          sharedDocs: 0,
          avgViewsPerDoc: 0,
        },
        page: 1,
        pageSize: 10,
        totalCount: 0,
        query: "",
        requiresLogin: false,
        homeCapabilityToken: "t",
        authMode: "none",
      }),
    );
    expect(html).toContain("2026-10-11 · 3 uploads");
    expect(html).toContain("calendar-level-4");
    expect(html).toContain("release date of this feature");
    expect([...html.matchAll(/class="calendar-cell calendar-level-\d"/g)]).toHaveLength(371 * 2 + 5);
  });
});
