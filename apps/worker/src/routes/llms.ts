import type { Context } from "hono";
import type { AppBindings } from "../types.js";

// Agent-facing guide served at /llms.txt (https://llmstxt.org).
// Keep the endpoint list in sync with src/routes/api.ts.
export function llmsGuide(origin: string): string {
  return `# sharehtml

> Publish HTML, Markdown, code, or data (CSV/JSON) files and get a shareable URL at ${origin}/d/<id>. Documents support comments, sharing, and tags. Use the CLI or the REST API below.

## Artifact kinds

- html: HTML files are stored and served in a sandboxed viewer. Scripts are stripped.
- markdown: upload the \`.md\` file with form field \`sourceKind=markdown\`; the server renders it to HTML and keeps the source.
- code (\`.ts\`, \`.py\`, ...): \`sharehtml deploy\` renders it with syntax highlighting. Over the raw API, send the rendered HTML as \`file\` plus the original as \`source\` with \`sourceKind=code\` and optional \`sourceLanguage\`.
- data (\`.csv\`, \`.json\`): \`sharehtml deploy\` uploads the raw file. The server renders a table, stats and a chart. Over the raw API, send the file as \`source\` with \`sourceKind=data\`.

## CLI

\`\`\`bash
npx -y @duyet/sharehtml@latest login            # store an API key
npx -y @duyet/sharehtml@latest deploy report.html  # publish or update a file
npx -y @duyet/sharehtml@latest list             # list your documents
npx -y @duyet/sharehtml@latest pull <id>        # download a document
npx -y @duyet/sharehtml@latest share <id>       # make shareable / unshare <id>
npx -y @duyet/sharehtml@latest deploy report.html --listed  # share and list on the public homepage (opt-in)
npx -y @duyet/sharehtml@latest comments <id>    # show unresolved comments
npx -y @duyet/sharehtml@latest skill            # install the agent skill
\`\`\`

## Authentication

- Publishing needs an API key (\`Authorization: Bearer shk_...\`) unless the deployment enables anonymous uploads. Anonymous upload is off by default on servers with sign-in; when on, \`POST /api/documents\` works without auth, returns \`deleteToken\` and \`deleteUrl\`, and the document expires after a few days.
- Everything else needs an API key: \`Authorization: Bearer shk_...\`. Create one at ${origin}/dashboard or with \`sharehtml login\`.

## REST API

- \`POST /api/documents\` — multipart upload: \`file\` (required), \`title\`, \`slug\`, \`source\`, \`sourceKind\` (html|markdown|code|data), \`listed\` (true to list on the public homepage; needs link sharing), \`sourceLanguage\`. Returns 200 with \`id\` and \`url\`.
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

## Limits and safety

- Uploads are capped (5 MB by default) and each account has a document and storage quota. Rate limits return 429.
- Pages are noindex and nofollow. Uploaded pages run no scripts. Documents are unlisted unless you pass \`listed\`.

## Docs

- [Human docs](${origin}/docs)
- [Upload quickstart (markdown)](${origin}/docs.md)
`;
}

// Usage guide only. Listing documents here would hand crawlers a link farm.
export function llmsTxtResponse(c: Context<AppBindings>) {
  const url = new URL(c.req.url);
  const origin = `${url.protocol}//${url.host}`;
  return c.text(llmsGuide(origin), 200, {
    "Content-Type": "text/markdown; charset=utf-8",
    "Cache-Control": "public, max-age=300",
  });
}
