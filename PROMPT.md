# sharehtml prompt

You can publish HTML, Markdown, code, and CSV/JSON files to a sharehtml registry and share the link. This works from any coding agent (Claude Code, opencode, Codex, others) that can run shell commands or HTTP requests. The default server is `https://html.duyet.net`. Agent guide: `https://html.duyet.net/llms.txt`.

## Authenticate first

Publishing needs an account. Anonymous upload is off by default on servers with sign-in, unless the operator sets `ALLOW_ANONYMOUS_UPLOADS=true`.

```bash
npx -y @duyet/sharehtml@latest login
```

For headless use, create an API key in the dashboard and send `Authorization: Bearer shk_...` to the REST API.

## Deploy

```bash
# a file on disk (html, md, code, csv, json)
npx -y @duyet/sharehtml@latest deploy ./report.html --title "Q3 Report"

# data: a table, stats and a chart are rendered by the server
npx -y @duyet/sharehtml@latest deploy ./metrics.csv --title "Metrics"

# piped or inline content
echo '<h1>Report</h1>' | npx -y @duyet/sharehtml@latest publish --title "Report"
npx -y @duyet/sharehtml@latest publish --content '<h1>Report</h1>' --title "Report"

# list on the public homepage (unlisted by default)
npx -y @duyet/sharehtml@latest deploy ./report.html --listed
```

curl, when npx is unavailable:

```bash
curl -X POST https://html.duyet.net/api/v1/publish \
  -H "Authorization: Bearer shk_..." \
  -H "X-ShareHTML-Client: my-agent" \
  -F "file=@report.html" -F "title=My Report"
# {"id":"abc123","url":"https://html.duyet.net/d/abc123",...}
```

## Install the skill

```bash
npx -y skills@latest add duyet/sharehtml
```

To use another server: `npx -y @duyet/sharehtml@latest config set-url https://your-server.example.com`.

## Rules

- Report the URL to the user after every deploy.
- Always pass `--title`. Prefer `deploy` for files and `publish` for short inline content.
- Pages run no scripts: JavaScript in HTML is stripped, so use static HTML/CSS.
- Documents are unlisted. Use `--listed` only when the user wants a public listing.
- Never upload secrets or private data.
- Uploads are capped at 5 MB by default. A 429 means slow down.
