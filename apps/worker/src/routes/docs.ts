import { Hono } from "hono";
import type { AppBindings } from "../types.js";
import { DocsView } from "../frontend/docs.js";
import { getAssetUrls } from "../utils/assets.js";

const docs = new Hono<AppBindings>();

// Cache headers for static documentation content
const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
  "CDN-Cacheable": "public",
};

docs.get("/", async (c) => {
  try {
    const assets = await getAssetUrls(c.env.ASSETS);
    const html = DocsView({ assets });

    // Return HTML with cache headers
    return c.html(html, {
      headers: CACHE_HEADERS,
    });
  } catch (error) {
    console.error("Docs route error:", error);
    return c.json({ error: "Failed to load docs", message: error?.message || String(error) }, 500);
  }
});

export { docs };
