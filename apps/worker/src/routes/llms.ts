import type { Context } from "hono";
import type { AppBindings } from "../types.js";
import { getRegistry } from "../utils/registry.js";

// Agent-facing guide served at /llms.txt (https://llmstxt.org).
// Keep the endpoint list in sync with src/routes/api.ts.
export function llmsGuide(origin: string): string {
  return `# sharehtml

> Publish HTML, Markdown, or code files and get a shareable URL at ${origin}/d/<id>. Documents support comments, sharing, and tags. Use the CLI or the REST API below.

## Artifact kinds

- html: HTML files are stored and served in a sandboxed viewer.
- markdown: upload the \`.md\` file with form field \`sourceKind=markdown\`; the server renders it to HTML and keeps the source.
- code and data (\`.ts\`, \`.py\`, \`.json\`, \`.csv\`, ...): \`sharehtml deploy\` renders them with syntax highlighting. Over the raw API, send the rendered HTML as \`file\` plus the original as \`source\` with \`sourceKind=code\` and optional \`sourceLanguage\`.

## CLI

\`\`\`bash
npx -y @duyet/sharehtml@latest login            # store an API key
npx -y @duyet/sharehtml@latest deploy report.html  # publish or update a file
npx -y @duyet/sharehtml@latest list             # list your documents
npx -y @duyet/sharehtml@latest pull <id>        # download a document
npx -y @duyet/sharehtml@latest share <id>       # make shareable / unshare <id>
npx -y @duyet/sharehtml@latest comments <id>    # show unresolved comments
npx -y @duyet/sharehtml@latest skill            # install the agent skill
\`\`\`

## Authentication

- Anonymous upload: \`POST /api/documents\` works without auth (unless the deployment uses Cloudflare Access) and returns \`deleteToken\` and \`deleteUrl\`.
- Everything else needs an API key: \`Authorization: Bearer shk_...\`. Create one at ${origin}/dashboard or with \`sharehtml login\`.

## REST API

- \`POST /api/documents\` — multipart upload: \`file\` (required), \`title\`, \`slug\`, \`source\`, \`sourceKind\` (html|markdown|code), \`sourceLanguage\`. Returns 200 with \`id\` and \`url\`.
- \`POST /api/v1/publish\` — same as above, returns 201.
- \`GET /api/documents\` — list your documents. Optional \`q\`, \`page\`, \`limit\`.
- \`GET /api/documents/recent\` — documents you viewed recently.
- \`GET /api/documents/by-filename?filename=<name>\` — find your document by filename.
- \`GET /api/documents/:id\` — document metadata.
- \`GET /api/documents/:id/raw\` — download (original source if stored, else rendered HTML).
- \`GET /api/documents/:id/source\` — original uploaded source.
- \`GET /api/documents/:id/rendered\` — rendered HTML.
- \`PUT /api/documents/:id\` — replace the file (same multipart fields as upload).
- \`DELETE /api/documents/:id\` — delete a document.
- \`DELETE /api/documents/:id/token/:token\` — delete with the upload \`deleteToken\` (no auth).
- \`GET|PUT /api/documents/:id/share\` — read or set sharing (\`{"mode":"link"}\` or \`{"mode":"private"}\`).
- \`GET|PUT|POST /api/documents/:id/tags\`, \`DELETE /api/documents/:id/tags/:tag\`, \`GET /api/tags\` — tags.
- \`GET /api/documents/:id/comments\` — comments on a document.

Example:

\`\`\`bash
curl -X POST ${origin}/api/v1/publish \\
  -H "Authorization: Bearer shk_..." \\
  -F "file=@report.html" -F "title=Q3 Report"
\`\`\`

## Docs

- [Human docs](${origin}/docs)
- [Upload quickstart (markdown)](${origin}/docs.md)
`;
}

export async function llmsTxtResponse(c: Context<AppBindings>) {
  const url = new URL(c.req.url);
  const origin = `${url.protocol}//${url.host}`;
  const docs = await getRegistry(c.env).listPublicDocuments();

  const lines = [llmsGuide(origin), "## Public documents", ""];
  if (docs.length === 0) lines.push("None yet.");
  for (const d of docs) lines.push(`- [${d.title}](${origin}/d/${d.id}) (${d.size} bytes)`);

  return c.text(lines.join("\n") + "\n", 200, {
    "Content-Type": "text/markdown; charset=utf-8",
    "Cache-Control": "public, max-age=300",
  });
}
