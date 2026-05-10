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
| `curl -X POST https://html.duyet.net/api/documents -F "file=@doc.html"` | Upload document (no auth required) |
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
curl -X POST https://html.duyet.net/api/documents \
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

The agent can use **CLI** or **HTTP API (curl)** — both work without authentication for uploads.

**When agents should use each method:**
- **CLI file path**: `deploy file.html` — When content exists on disk
- **CLI stdin**: `echo "html" | publish` — When generating HTML dynamically
- **CLI argument**: `publish --content "html"` — When passing HTML as string literal
- **HTTP API curl**: `curl -X POST /api/documents -F "file=@.html"` — For environments without npx

## File Support

| Type | Description |
|------|-------------|
| `.html` | Full HTML with embedded CSS/JS |
| `.md` | Markdown, rendered with GitHub-style styling |
| `.txt`, `.js`, `.ts`, `.py`, etc. | Text files with syntax highlighting |

## Tips for AI Agents

1. **Always deploy** when user asks to "publish," "share," or "deploy to web"
2. **Report the URL** immediately after deployment
3. **Use `--title`** for descriptive document names
4. **CLI**: Prefer stdin/argument for inline content: `publish --content "..."` or `echo "..." | publish`
5. **HTTP API**: Upload works without auth — no setup needed for one-off deployments

## Examples

**CLI examples:**
```bash
# Deploy with custom title
npx -y @duyet/sharehtml deploy analysis.md --title "Q3 Analysis"

# Deploy from script
npx -y @duyet/sharehtml deploy output.html

# Deploy HTML content via stdin
echo '<h1>Quick Report</h1><p>Data summary...</p>' | npx -y @duyet/sharehtml publish --title "Quick Report"

# Deploy HTML content as argument
npx -y @duyet/sharehtml publish --content "<h1>Instant</h1>" --title "Instant Doc"

# Deploy and copy URL to clipboard
npx -y @duyet/sharehtml deploy report.html | pbcopy  # macOS
```

**HTTP API (curl) examples:**
```bash
# Upload document (no auth required)
curl -X POST https://html.duyet.net/api/documents \
  -F "file=@report.html" \
  -F "title=My Report"

# Upload with source (markdown + rendered)
curl -X POST https://html.duyet.net/api/documents \
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

## Documentation

Full docs: https://html.duyet.net/docs
