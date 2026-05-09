# sharehtml ✦

Deploy your ideas instantly. A simple, editorial platform for sharing HTML reports, Markdown notes, and code snippets with the world.

This is a fork of [jonesphillip/sharehtml](https://github.com/jonesphillip/sharehtml), enhanced with a modern aesthetic and deep AI agent integration.

![sharehtml screenshot](assets/screenshot.png)

## What is sharehtml?

Deploy a local document, get a link where others can view it and collaborate with comments, reactions, and live presence. Re-deploy to update the content at the same URL. Markdown and common code files are converted to styled HTML automatically.

- **Anthropic-inspired UI** — A warm, editorial interface with a tinted cream canvas and slab-serif typography.
- **AI Agent Skills** — Deep integration for AI agents (Claude Code, etc.) to deploy and manage documents on your behalf.
- **Short URLs** — Compact 5-character IDs (e.g., `https://html.duyet.net/d/abcde`).
- **Direct HTML Rendering** — Serve raw content directly via `.html` extension.
- **Collaborative** — Comments, threaded replies, emoji reactions, and text anchoring.
- **Live Presence** — See who's viewing and their selections in real-time.

## Quick Start

You can use the CLI instantly without manual installation:

```bash
# configure to use the production instance
npx -y sharehtml@latest config set-url https://html.duyet.net

# deploy a file
npx -y sharehtml@latest deploy my-report.html
```

## AI Agent Integration

Enhance your AI assistant (like Claude Code) with `sharehtml` capabilities:

```bash
npx -y skills@latest add duyet/sharehtml
```

The skill teaches agents to:
- Deploy or update documents via CLI.
- Perform `diff` before overwriting remote files.
- Pull and review comments/feedback.
- Manage sharing permissions.

## Self-Hosting

If you want to run your own instance on Cloudflare:

```bash
git clone https://github.com/duyet/sharehtml.git
cd sharehtml
pnpm install
npx wrangler login
pnpm run setup
```

The setup script handles R2 provisioning, Durable Objects, and worker deployment.

## Architecture

```
CLI ──► Worker ──► R2 (HTML storage)
         │
Browser ◄┘──► Durable Objects
               ├── RegistryDO (users, documents, views)
               └── DocumentDO (per-doc comments, reactions, presence via WebSocket)
```

| Component | Purpose |
|-----------|---------|
| **[Worker](https://developers.cloudflare.com/workers/)** | HTTP routing, auth, serves viewer shell and home page |
| **RegistryDO** | Global [Durable Object](https://developers.cloudflare.com/durable-objects/) — users, document metadata, view history (SQLite) |
| **DocumentDO** | Per-document Durable Object — comments, reactions, real-time presence over WebSocket |
| **[R2](https://developers.cloudflare.com/r2/)** | Stores the actual HTML files |
| **CLI** | Bun-based command-line tool for deploying and managing documents |

## CLI Commands

| Command | Description |
|---------|-------------|
| `npx sharehtml deploy <file>` | Deploy an HTML, Markdown, or code file |
| `npx sharehtml list` | List your documents |
| `npx sharehtml open <id>` | Open a document in the browser |
| `npx sharehtml pull <id>` | Download a document locally |
| `npx sharehtml diff <file>` | Compare local file against remote |
| `npx sharehtml comments <id>` | Show unresolved comments for a document |
| `npx sharehtml delete <id>` | Delete a document |
| `npx sharehtml share <id>` | Make a document publicly shareable |
| `npx sharehtml unshare <id>` | Make a document private again |
| `npx sharehtml config set-url <url>` | Set the sharehtml instance URL |

## License

Apache-2.0

---
Original author: [Phillip Jones](https://github.com/jonesphillip)
Fork author: [Duyet Le](https://github.com/duyet)
Production: [html.duyet.net](https://html.duyet.net)
