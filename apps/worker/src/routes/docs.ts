import { Hono } from "hono";
import type { AppBindings } from "../types.js";
import { DocsView } from "../frontend/docs.js";
import { getAssetUrls } from "../utils/assets.js";

const docs = new Hono<AppBindings>();

docs.get("/", async (c) => {
  const assets = await getAssetUrls(c.env.ASSETS);
  return c.html(DocsView({ assets }));
});

export { docs };
