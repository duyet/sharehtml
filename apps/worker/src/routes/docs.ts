import { Hono } from "hono";
import type { Context } from "hono";
import type { AppBindings } from "../types.js";
import { DocsView } from "../frontend/docs.js";
import { cspHeader } from "../utils/csp.js";
import { getAssetUrls } from "../utils/assets.js";

const docs = new Hono<AppBindings>();

// Cache headers for static documentation content
const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
  "CDN-Cacheable": "public",
};

export const DOCS_MARKDOWN = `# sharehtml

Deploy HTML, Markdown, or text documents and get a shareable URL.

## Upload a document

No authentication is required for uploads.

\`\`\`bash
curl -X POST https://html.duyet.net/api/documents \\
  -F "file=@report.html" \\
  -F "title=Q3 Report"
\`\`\`

The response includes the document ID and public URL:

\`\`\`json
{
  "id": "doc_abc123",
  "url": "https://html.duyet.net/d/doc_abc123",
  "title": "Q3 Report",
  "filename": "report.html",
  "size": 4096,
  "isShared": true
}
\`\`\`

## Agent prompt

Use this when asking an AI agent to publish a file:

\`\`\`text
Deploy this to the web using sharehtml. Use the upload API, no auth required:
curl -X POST https://html.duyet.net/api/documents -F "file=@path/to/file.html" -F "title=Document Title"
Reference: https://html.duyet.net/docs.md
\`\`\`

## API notes

- \`POST /api/documents\` uploads a document without authentication. Returns \`deleteToken\` and \`deleteUrl\`.
- \`POST /api/v1/publish\` is also available for publishing.
- \`GET /api/documents\` lists documents and requires authentication.
- \`GET /api/documents/:id\` returns document metadata.
- \`PUT /api/documents/:id\` updates a document and requires authentication.
- \`DELETE /api/documents/:id\` deletes a document and requires authentication.
- \`DELETE /api/documents/:id/token/:token\` deletes a document using the delete token from upload (no auth required).
`;

export function docsMarkdownResponse(c: Context<AppBindings>) {
  return c.text(DOCS_MARKDOWN, 200, {
    ...CACHE_HEADERS,
    "Content-Type": "text/markdown; charset=utf-8",
  });
}

docs.get("/", async (c) => {
  try {
    const assets = await getAssetUrls(c.env.ASSETS);
    const html = DocsView({ assets });

    // Return HTML with cache headers
    return c.html(html, {
      headers: {
        ...CACHE_HEADERS,
        "Content-Security-Policy": cspHeader({}),
      },
    });
  } catch (error) {
    console.error("Docs route error:", error);
    return c.json({ error: "Failed to load docs", message: error?.message || String(error) }, 500);
  }
});

export { docs };
