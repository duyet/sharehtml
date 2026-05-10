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
- Anonymous or authenticated deployment
- Documents expire after 24h (anonymous) or persist forever (authenticated)

**Default server:** `https://html.duyet.net`

## Quick Deploy

Deploy any file instantly:

```bash
npx -y @duyet/sharehtml deploy path/to/file.html
```

Returns a shareable URL like `https://html.duyet.net/d/abc123`.

## Common Commands

| Command | Description |
|---------|-------------|
| `npx -y @duyet/sharehtml deploy <file>` | Deploy or update a document |
| `echo '<html>' \| npx -y @duyet/sharehtml publish` | Deploy HTML content via stdin pipe |
| `npx -y @duyet/sharehtml publish --content '<html>'` | Deploy HTML content directly as argument |
| `npx -y @duyet/sharehtml deploy <file> --title "My Title"` | Deploy with custom title |
| `npx -y @duyet/sharehtml deploy <file> --title "My Title"` | Deploy with custom title |
| `npx -y @duyet/sharehtml login` | Authenticate for persistent storage |
| `npx -y @duyet/sharehtml list` | List your documents (authenticated) |
| `npx -y @duyet/sharehtml pull <id>` | Download a document's source |

## Workflows

### One-off deployment (no account)

```bash
npx -y @duyet/sharehtml deploy report.html
```

- No signup required
- Document expires after 24 hours
- Perfect for quick shares and prototypes

### Persistent documents (with account)

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

The agent will use the CLI and return the live URL.

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
4. **Suggest login** if user wants permanent storage

## Examples

```bash
# Deploy with custom title
npx -y @duyet/sharehtml deploy analysis.md --title "Q3 Analysis"

# Deploy from script
npx -y @duyet/sharehtml deploy output.html

# Deploy HTML content via stdin
echo '<h1>Quick Report</h1><p>Data summary...</p>' | npx -y @duyet/sharehtml publish --title "Quick Report"

# Deploy HTML content as argument
npx -y @duyet/sharehtml publish --content '<h1>Instant</h1>' --title "Instant Doc"

# Deploy and copy URL to clipboard
npx -y @duyet/sharehtml deploy report.html | pbcopy  # macOS
```

## Documentation

Full docs: https://html.duyet.net/docs
