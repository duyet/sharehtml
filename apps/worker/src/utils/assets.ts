export interface AssetUrls {
  homeClientJs: string;
  shellClientJs: string;
  shellClientCss: string;
  homeCss: string;
  collabJs: string;
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
      const collabEntry = manifest["src/client/collab-client.ts"];

      if (!shellEntry || !homeEntry || !collabEntry) {
        throw new Error("Missing required entries in asset manifest");
      }

      cachedUrls = {
        homeClientJs: "/" + homeEntry.file,
        shellClientJs: "/" + shellEntry.file,
        shellClientCss: shellEntry.css?.[0] ? "/" + shellEntry.css[0] : "",
        homeCss: homeEntry.css?.[0] ? "/" + homeEntry.css[0] : "",
        collabJs: "/" + collabEntry.file,
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
    collabJs: "/src/client/collab-client.ts",
  };
}
