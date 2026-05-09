import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";

const disableInspector = process.env.PLAYWRIGHT === "1";

export default defineConfig({
  plugins: [cloudflare({ inspectorPort: disableInspector ? false : undefined })],
  build: {
    manifest: "manifest.json",
    rollupOptions: {
      input: {
        "home-client": "src/client/home-client.ts",
        "home.css": "src/client/home.css",
        "shell-client": "src/client/shell-client.ts",
        "shell-client.css": "src/client/styles.css",
        "dashboard-client": "src/client/dashboard-client.ts",
        "collab-client": "src/client/collab-client.ts",
        "docs.css": "src/client/docs.css",
        "components.css": "src/client/components.css",
      },
    },
  },
});
