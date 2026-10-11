# Artifact kinds

sharehtml stores every document as two blobs in R2:

- **rendered**: a full HTML page shown in the viewer
- **source**: the original file, downloadable from `/d/:id/source` and `sharehtml pull`

The `source_kind` column records which kind a document is. Every kind renders to static HTML. The viewer strips scripts and `on*` attributes (`src/utils/sanitize-html.ts`), shows the page in an `<iframe sandbox="">`, and serves raw `/d/:id.html` with `Content-Security-Policy: default-src 'none'`. No kind runs JavaScript.

| Kind | Files | Rendered by | Source MIME |
|------|-------|-------------|-------------|
| `html` | `.html`, `.htm` | used as-is (sanitized on read) | `text/html` |
| `markdown` | `.md`, `.markdown` | CLI (`marked` + highlight.js), or the worker when no pre-rendered `file` is sent | `text/markdown` |
| `code` | `.ts`, `.py`, `.go`, ... (see `CODE_LANGUAGE_BY_EXTENSION` in the CLI) | CLI, highlight.js | `text/plain` |
| `data` | `.csv`, `.json` | always the worker (`src/utils/data-render.ts`) | `text/csv` or `application/json` |

## `data`

`sharehtml deploy report.csv` or `sharehtml deploy metrics.json` uploads the raw file with `sourceKind=data`. The worker ignores any client-rendered HTML for this kind and renders the page itself, so every client gets the same output. The page has:

- title and row / column counts
- a stat card (min, max, mean, sum) for each numeric column (a column is numeric when every non-empty cell is a number)
- an inline SVG chart for the first numeric column: bars up to 60 rows, a line beyond that
- the full table with a sticky header

Accepted input:

- CSV per RFC 4180: quoted fields, `""` escapes, commas and newlines inside quotes, CRLF, UTF-8 BOM. The first row is the header.
- JSON: an array of objects (columns are the union of keys), an array of arrays (first row is the header), or `{ "columns": [...], "rows": [...] }`. Other JSON renders as an escaped pretty-printed block.

The table is capped at 5,000 rows (`DATA_ROW_LIMIT`). Stats and the chart cover the rows shown; the page says so and the full file stays downloadable as source. All cell text is HTML-escaped.

Piped content (`--type data`) is detected as JSON when it starts with `[` or `{`, else CSV.

## PLAN: interactive dashboards (not implemented)

Goal: let agents publish an HTML page plus separate data files, where the page uses JavaScript (charts, filters, sorting) to read the data.

This cannot run on the current viewer origin. Scripts there could read the viewer's cookies and call the API as the signed-in user, which is why the sandbox has no `allow-scripts` and the raw page has `default-src 'none'`. The safe design moves scripted content to a separate origin.

### Design

- Serve interactive artifacts from a separate registrable domain, e.g. `<id>.sharehtml-usercontent.net`. A subdomain of the main site is not enough, since it would share cookies and the site boundary.
- Embed them in the viewer with `<iframe sandbox="allow-scripts">` and no `allow-same-origin`, so the frame gets an opaque origin and no storage.
- Serve data files next to the page (`/<id>/data/*.csv|json`) from the same user-content origin, with `Access-Control-Allow-Origin: *` and no credentials, since requests from an opaque origin send `Origin: null`.
- CSP on the user-content origin: `default-src 'none'; script-src 'self' 'unsafe-inline'; connect-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:`. No third-party scripts at first.
- Access control: user-content requests carry no session. Private documents need a short-lived signed token in the URL, issued by the viewer after its own access check.

### Steps

1. Add a source kind (e.g. `bundle`) whose source is a manifest plus files; store files under `<id>/bundle/` in R2.
2. Add a CLI command or flag to deploy a directory (page + data files), with size and file-count limits.
3. Add a Worker route (or second Worker) bound to the user-content domain that only serves bundle files, with the CSP and CORS above.
4. Add signed, expiring URLs for private bundles, minted by `/d/:id` after the access check.
5. Update the viewer shell to use the user-content origin and `sandbox="allow-scripts"` only for this kind. Every other kind keeps `sandbox=""`.
6. Extend `e2e/viewer-security.spec.ts`: the frame cannot read parent cookies, `document.domain` / storage is denied, and API calls from the frame fail.

### Risks

- Phishing: scripted pages can draw fake login forms. Keep the sharehtml chrome around the frame, block top navigation (no `allow-top-navigation`), and add abuse reporting.
- Data exfiltration: scripts can send viewer-supplied input anywhere unless `connect-src` stays `'self'`. Loosening it later is a policy decision, not a default.
- Token leakage: signed URLs can leak through referrers or copy-paste. Keep them short-lived and set `Referrer-Policy: no-referrer`.
- Resource abuse: crypto-mining or heavy scripts. Rely on browser sandboxing and size limits; consider rate limits per artifact.
- Operational cost: a second domain, certificate, and route to maintain, and a second set of security tests.
- Comments and anchors rely on reading rendered text in the shell; scripted content changes after load, so comment anchoring may need to stay on static kinds.
