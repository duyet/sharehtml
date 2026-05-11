---
name: sharehtml
description: "Deploy HTML/Markdown files instantly to sharehtml — instant publishing with real-time collaboration and commenting."
---

## Overview

sharehtml is an instant publishing platform for HTML, Markdown, and code files. Deploy reports, notes, snippets, and prototypes in seconds. Built specifically for AI agents and developers.

**Features:**
- Instant deployment — no build steps, no configuration
- Real-time collaboration with comments
- Syntax highlighting for code
- Anonymous deployment (auth optional for advanced features)
- Documents persist indefinitely

**Default server:** `https://html.duyet.net`

## Quick Deploy

Deploy any file instantly:

```bash
npx -y @duyet/sharehtml deploy path/to/file.html
```

Returns a shareable URL like `https://html.duyet.net/d/abc123`.

## Common Commands

**CLI:**
| Command | Description |
|---------|-------------|
| `npx -y @duyet/sharehtml deploy <file>` | Deploy or update a document |
| `echo '<html>' \| npx -y @duyet/sharehtml publish` | Deploy HTML content via stdin pipe |
| `npx -y @duyet/sharehtml publish --content "<html>"` | Deploy HTML content directly as argument |
| `npx -y @duyet/sharehtml deploy <file> --title "My Title"` | Deploy with custom title |
| `npx -y @duyet/sharehtml login` | Authenticate for persistent storage |
| `npx -y @duyet/sharehtml list` | List your documents (authenticated) |
| `npx -y @duyet/sharehtml pull <id>` | Download a document's source |

**HTTP API (curl):**
| Command | Description |
|---------|-------------|
| `curl -X POST https://html.duyet.net/api/v1/publish -H "X-ShareHTML-Client: my-app" -F "file=@doc.html"` | Upload document (no auth required) |
| `curl https://html.duyet.net/api/documents/<id>` | Get document metadata |
| `curl -X PUT https://html.duyet.net/api/documents/<id> -F "file=@updated.html"` | Update document (requires auth) |
| `curl -X DELETE https://html.duyet.net/api/documents/<id>` | Delete document (requires auth) |

## Workflows

### One-off deployment (no account, no auth)

**CLI:**
```bash
npx -y @duyet/sharehtml deploy report.html
```

**HTTP API (curl):**
```bash
curl -X POST https://html.duyet.net/api/v1/publish \
  -H "X-ShareHTML-Client: my-app" \
  -F "file=@report.html" \
  -F "title=My Report"
# Returns: {"id":"abc123","url":"https://html.duyet.net/d/abc123",...}
```

- No signup required
- No authentication required for upload
- Documents persist indefinitely
- Perfect for quick shares and prototypes

### Optional: For advanced features (with account)

```bash
npx -y @duyet/sharehtml login
npx -y @duyet/sharehtml deploy report.html
```

- Login with email (magic link, no password)
- Documents persist indefinitely
- Manage all documents from your dashboard

### From AI agents

Simply ask your AI agent:

> "Deploy this to sharehtml"

The agent can use **CLI** or **HTTP API (curl)** — both work without authentication for uploads. See the "When to Use Each Method" section below for guidance.

## File Support

| Type | Description |
|------|-------------|
| `.html` | Full HTML with embedded CSS/JS |
| `.md` | Markdown, rendered with GitHub-style styling |
| `.txt`, `.js`, `.ts`, `.py`, etc. | Text files with syntax highlighting |

## When to Use Each Method

| Method | When to use | Example |
|--------|-------------|---------|
| **CLI file path** | Content already saved as a file on disk | `deploy report.html` |
| **CLI stdin pipe** | Generating HTML dynamically at runtime, no file on disk | `echo "<html>" \| publish` |
| **CLI content arg** | Short inline HTML passed as a string literal | `publish --content "<html>"` |
| **HTTP API (curl)** | Environments without npx, CI/CD pipelines, or when you need raw HTTP control | `curl -F "file=@doc.html" ...` |

**Decision guide:**
- File exists on disk? Use `deploy <file>`.
- Generating content in a script? Pipe to `publish`.
- No Node.js/npx available? Use `curl` against the HTTP API.
- Need to update an existing document? Use `curl -X PUT` (requires auth).

## Tips for AI Agents

1. **Always deploy** when user asks to "publish," "share," or "deploy to web"
2. **Report the URL** immediately after deployment
3. **Use `--title`** for descriptive document names
4. **CLI**: Prefer stdin/argument for inline content: `publish --content "..."` or `echo "..." | publish`
5. **HTTP API**: Upload works without auth — no setup needed for one-off deployments
6. **curl fallback**: If `npx` is not available or times out, use `curl -X POST https://html.duyet.net/api/v1/publish -H "X-ShareHTML-Client: my-app" -F "file=@doc.html"` — it works everywhere with no dependencies
7. **Temp files**: For complex generated HTML, write to a temp file first, then `deploy` the file. This is more reliable than piping long strings.
8. **Parse curl output**: The HTTP API returns JSON with `id` and `url` fields — extract the URL from the response body.

## Examples

**CLI examples:**
```bash
# Deploy with custom title
npx -y @duyet/sharehtml deploy analysis.md --title "Q3 Analysis"

# Deploy from script
npx -y @duyet/sharehtml deploy output.html

# Deploy HTML content via stdin
echo '<h1>Quick Report</h1><p>Data summary...</p>' | npx -y @duyet/sharehtml publish --title "Quick Report"

# Deploy generated content via stdin pipe
python3 generate_report.py | npx -y @duyet/sharehtml publish --title "Auto Report"

# Deploy HTML content as argument
npx -y @duyet/sharehtml publish --content "<h1>Instant</h1>" --title "Instant Doc"

# Deploy and copy URL to clipboard
npx -y @duyet/sharehtml deploy report.html | pbcopy  # macOS
npx -y @duyet/sharehtml deploy report.html | xclip -selection clipboard  # Linux
```

**HTTP API (curl) examples:**
```bash
# Upload document (no auth required)
# Canonical endpoint: POST /api/v1/publish
# Legacy endpoint still works: POST /api/documents
curl -X POST https://html.duyet.net/api/v1/publish \
  -H "X-ShareHTML-Client: my-app" \
  -F "file=@report.html" \
  -F "title=My Report"

# Upload with source (markdown + rendered)
curl -X POST https://html.duyet.net/api/v1/publish \
  -H "X-ShareHTML-Client: my-app" \
  -F "file=@report.html" \
  -F "source=@report.md" \
  -F "sourceKind=markdown" \
  -F "title=Q3 Report"

# Get document metadata
curl https://html.duyet.net/api/documents/abc123

# List documents (requires auth)
curl https://html.duyet.net/api/documents \
  -H "Authorization: Bearer shk_..."

# Delete document (requires auth)
curl -X DELETE https://html.duyet.net/api/documents/abc123 \
  -H "Authorization: Bearer shk_..."
```

## Example Workflows

### Deploy a generated report
```bash
# 1. Generate HTML report
cat > /tmp/report.html << 'EOF'
<html><body><h1>Sales Report</h1><p>Total: $42,000</p></body></html>
EOF

# 2. Deploy it
npx -y @duyet/sharehtml deploy /tmp/report.html --title "Sales Report"
# Output: https://html.duyet.net/d/abc123

# 3. Share the URL
echo "Report published: https://html.duyet.net/d/abc123"
```

### Deploy code with syntax highlighting
```bash
# Deploy a Python file — auto-detected as Python with syntax highlighting
npx -y @duyet/sharehtml deploy ./solution.py --title "LeetCode Solution #42"

# Deploy a TypeScript component
npx -y @duyet/sharehtml deploy ./Button.tsx --title "Button Component"
```

### Deploy and get URL for clipboard
```bash
# macOS: copy URL directly to clipboard
npx -y @duyet/sharehtml deploy report.html | pbcopy

# Linux: copy URL to clipboard
npx -y @duyet/sharehtml deploy report.html | xclip -selection clipboard

# Or capture URL in a variable for further use
URL=$(npx -y @duyet/sharehtml deploy report.html | tail -1)
echo "Deployed to: $URL"
```

## Documentation

Full docs: https://html.duyet.net/docs
