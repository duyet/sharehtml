export interface AssetUrls {
  homeClientJs: string;
  shellClientJs: string;
  shellClientCss: string;
  homeCss: string;
  dashboardCss: string;
  dashboardClientJs: string;
  collabJs: string;
  docsCss: string;
  shared: string;
}

interface ManifestEntry {
  file: string;
  css?: string[];
}

let cachedUrls: AssetUrls | null = null;

export async function getAssetUrls(assets: Fetcher): Promise<AssetUrls> {
  if (cachedUrls) return cachedUrls;

  try {
    const resp = await assets.fetch(new Request("http://localhost/manifest.json"));
    if (resp.ok) {
      const manifest = await resp.json<Record<string, ManifestEntry>>();

      const shellEntry = manifest["src/client/shell-client.ts"];
      const homeEntry = manifest["src/client/home-client.ts"];
      const dashboardEntry = manifest["src/client/dashboard-client.ts"];
      const collabEntry = manifest["src/client/collab-client.ts"];
      const docsEntry = manifest["src/client/docs.css"];
      const sharedEntry = manifest["src/client/shared.js"];

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
        docsCss: docsEntry?.file ? "/" + docsEntry.file : "",
        shared: sharedEntry?.file ? "/" + sharedEntry.file : "",
      };

      return cachedUrls;
    }
    console.error(`Asset manifest fetch failed with status: ${resp.status}`);
  } catch (error) {
    console.error("Error loading asset manifest:", error);
  }

  return {
    homeClientJs: "/assets/home-client-CfkE8Xft.js",
    shellClientJs: "/assets/shell-client-DQLxygcD.js",
    shellClientCss: "/assets/shell-client-CLU8LEo7.css",
    homeCss: "/assets/home-xHxNyIrl.css",
    dashboardCss: "/assets/dashboard-client-DRMobfBU.css",
    dashboardClientJs: "/assets/dashboard-client-CTw9Dz-q.js",
    collabJs: "/assets/collab-client-Ch7HLiuG.js",
    docsCss: "/assets/docs-CxSgqYQp.css",
    shared: "/assets/shared-CiSuWWxG.js",
  };
}
