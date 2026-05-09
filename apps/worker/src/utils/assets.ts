export interface AssetUrls {
  homeClientJs: string;
  shellClientJs: string;
  shellClientCss: string;
  homeCss: string;
  dashboardCss: string;
  dashboardClientJs: string;
  collabJs: string;
  docsCss: string;
}

interface ManifestEntry {
  file: string;
  css?: string[];
}

let cachedUrls: AssetUrls | null = null;

export async function getAssetUrls(assets: Fetcher): Promise<AssetUrls> {
  if (cachedUrls) return cachedUrls;

  try {
    const resp = await assets.fetch(new Request("https://assets.local/manifest.json"));
    if (resp.ok) {
      const manifest = await resp.json<Record<string, ManifestEntry>>();

      const shellEntry = manifest["src/client/shell-client.ts"];
      const homeEntry = manifest["src/client/home-client.ts"];
      const dashboardEntry = manifest["src/client/dashboard-client.ts"];
      const collabEntry = manifest["src/client/collab-client.ts"];
      const docsEntry = manifest["src/client/docs.css"];

      if (!shellEntry || !homeEntry || !dashboardEntry || !collabEntry) {
        throw new Error("Missing required entries in asset manifest");
      }

      cachedUrls = {
        homeClientJs: "/" + homeEntry.file,
        shellClientJs: "/" + shellEntry.file,
        shellClientCss: shellEntry.css?.[0] ? "/" + shellEntry.css[0] : "",
        homeCss: homeEntry.css?.[0] ? "/" + homeEntry.css[0] : "",
        dashboardCss: dashboardEntry.css?.[0] ? "/" + dashboardEntry.css[0] : "",
        dashboardClientJs: "/" + dashboardEntry.file,
        collabJs: "/" + collabEntry.file,
        docsCss: docsEntry?.file ? "/" + docsEntry.file : "/src/client/docs.css",
      };

      return cachedUrls;
    }
    console.error(`Asset manifest fetch failed with status: ${resp.status}`);
  } catch (error) {
    console.error("Error loading asset manifest:", error);
  }

  return {
    homeClientJs: "/src/client/home-client.ts",
    shellClientJs: "/src/client/shell-client.ts",
    shellClientCss: "",
    homeCss: "/src/client/home.css",
    dashboardCss: "/src/client/dashboard.css",
    dashboardClientJs: "/src/client/dashboard-client.ts",
    collabJs: "/src/client/collab-client.ts",
    docsCss: "/src/client/docs.css",
  };
}
