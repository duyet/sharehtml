import { HomeView } from "../src/frontend/home.js";
import type { AssetUrls } from "../src/utils/assets.js";

const assets: AssetUrls = {
  homeClientJs: "/assets/home.js",
  shellClientJs: "/assets/shell.js",
  shellClientCss: "/assets/shell.css",
  homeCss: "/assets/home.css",
  dashboardCss: "/assets/dashboard.css",
  dashboardClientJs: "/assets/dashboard.js",
  collabJs: "/assets/collab.js",
  docsCss: "/assets/docs.css",
  shared: "/assets/shared.js",
};

describe("HomeView analytics privacy", () => {
  it("hides private analytics metrics from unauthenticated Clerk visitors", () => {
    const html = String(HomeView({
      assets,
      email: "unauthenticated@clerk",
      workerUrl: "https://example.com",
      documents: [],
      recentViews: [],
      analytics: {
        totalDocs: 12,
        todayUploads: 3,
        totalViews: 44,
        totalUsers: null,
        totalStorage: null,
        todayViews: 9,
        uploadsPerDay: [{ date: "2026-06-05", count: 3 }],
      },
      page: 1,
      pageSize: 10,
      totalCount: 0,
      query: "",
      requiresLogin: false,
      homeCapabilityToken: "token",
      authMode: "clerk",
      clerkPublishableKey: "pk_test_Y2xlcmsuZXhhbXBsZS5jb20k",
    }));

    expect(html).toContain("Total uploads");
    expect(html).toContain("Page views");
    expect(html).toContain("Docs viewed today");
    expect(html).not.toContain("Storage used");
    expect(html).not.toContain('class="stat-label">Users<');
    expect([...html.matchAll(/class="stat-label">/g)]).toHaveLength(4);
  });
});
