import { Hono } from "hono";
import type { AppBindings } from "../types.js";
import { DocsView } from "../frontend/docs.js";
import { getAssetUrls } from "../utils/assets.js";

const docs = new Hono<AppBindings>();

docs.get("/", async (c) => {
  try {
    const assets = await getAssetUrls(c.env.ASSETS);
    return c.html(DocsView({ assets }));
  } catch (error) {
    console.error("Docs route error:", error);
    return c.json({ error: "Failed to load docs", details: error.message }, 500);
  }
});

export { docs };
