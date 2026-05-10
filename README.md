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
You can use the CLI instantly without manual installation. It is pre-configured to use `https://html.duyet.net` by default:
```bash
# deploy a file
npx -y @duyet/sharehtml@latest deploy my-report.html
```
## AI Agent Integration
Enhance your AI assistant (like Claude Code) with `sharehtml` capabilities:
npx -y skills@latest add duyet/sharehtml
The skill teaches agents to:
- Deploy or update documents via CLI using `npx -y @duyet/sharehtml@latest`.
- Perform `diff` before overwriting remote files.
- Pull and review comments/feedback.
- Manage sharing permissions.
## Self-Hosting
If you want to run your own instance on Cloudflare:
git clone https://github.com/duyet/sharehtml.git
cd sharehtml
pnpm install
npx wrangler login
pnpm run setup
The setup script handles R2 provisioning, Durable Objects, and worker deployment.
## Authentication
sharehtml supports three authentication modes:
| Mode | Description | Use Case |
|------|-------------|----------|
| **Clerk** | Full-featured auth with sign-in UI, user accounts | Recommended for production |
| **Cloudflare Access** | Zero Trust JWT authentication | Corporate deployments |
| **None** | No authentication (dev mode) | Local development |
### Setting up Clerk Authentication
Clerk is the recommended auth provider for self-hosted instances. The setup script (`pnpm run setup`) will guide you through the configuration:
1. **Create a Clerk Application** at [dashboard.clerk.com](https://dashboard.clerk.com)
2. **Get your API Keys** from API Keys section:
   - Publishable Key (starts with `pk_`)
   - Secret Key (starts with `sk_`)
   - JWT Verification Key (PEM format, optional but recommended)
3. **Run the setup script:**
   ```bash
   pnpm run setup
   # Select "1. Clerk" when prompted
   ```
4. **The script will:**
   - Store `CLERK_SECRET_KEY` and `CLERK_JWT_KEY` as Wrangler secrets
   - Set `AUTH_MODE=clerk` and `CLERK_PUBLISHABLE_KEY` in production vars
   - Deploy your worker
### Environment Variables
| Variable | Type | Description |
|----------|------|-------------|
| `AUTH_MODE` | Var | `"clerk"`, `"access"`, or `"none"` |
| `CLERK_PUBLISHABLE_KEY` | Var | Public key for frontend (starts with `pk_`) |
| `CLERK_SECRET_KEY` | Secret | Server-side API key (starts with `sk_`) |
| `CLERK_JWT_KEY` | Secret | PEM public key for JWT verification |
| `VIEWER_CAPABILITY_SECRET` | Secret | Required when auth is enabled |
### CLI Authentication
When your instance uses Clerk authentication, the CLI will automatically detect it and guide you through login:
npx @duyet/sharehtml login
The login flow:
1. CLI displays a URL to visit in your browser
2. Sign in with Clerk (if not already authenticated)
3. Copy the session token from the page
4. Paste it back in the CLI
5. CLI validates the token and stores it locally
> **Note:** Make sure you've set your instance URL first with `npx @duyet/sharehtml config set-url <url>`.
To change authentication mode, run `pnpm run setup` again and select a different option.
## Architecture
CLI ──► Worker ──► R2 (HTML storage)
         │
Browser ◄┘──► Durable Objects
               ├── RegistryDO (users, documents, views)
               └── DocumentDO (per-doc comments, reactions, presence via WebSocket)
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
| `npx @duyet/sharehtml deploy <file>` | Deploy an HTML, Markdown, or code file |
| `echo '<html>' \| npx @duyet/sharehtml publish` | Deploy HTML content via stdin pipe |
| `npx @duyet/sharehtml publish '<html>' --content` | Deploy HTML content directly as argument |
| `npx @duyet/sharehtml list` | List your documents |
| `npx @duyet/sharehtml open <id>` | Open a document in the browser |
| `npx @duyet/sharehtml pull <id>` | Download a document locally |
| `npx @duyet/sharehtml diff <file>` | Compare local file against remote |
| `npx @duyet/sharehtml comments <id>` | Show unresolved comments for a document |
| `npx @duyet/sharehtml delete <id>` | Delete a document |
| `npx @duyet/sharehtml share <id>` | Make a document publicly shareable |
| `npx @duyet/sharehtml unshare <id>` | Make a document private again |
| `npx @duyet/sharehtml login` | Authenticate with your sharehtml instance |
| `npx @duyet/sharehtml config set-url <url>` | Set the sharehtml instance URL |
## License
Apache-2.0
---
Original author: [Phillip Jones](https://github.com/jonesphillip)
Fork author: [Duyet Le](https://github.com/duyet)
Production: [html.duyet.net](https://html.duyet.net)
