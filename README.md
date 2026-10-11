# sharehtml

**The artifact registry for coding agents.** Claude Code, opencode, Codex, or any agent that can run a shell command or send an HTTP request can publish a report, note, code file, or dataset and get back a link a human can open, comment on, and share.

This is a fork of [jonesphillip/sharehtml](https://github.com/jonesphillip/sharehtml).

![sharehtml screenshot](assets/screenshot.png)

## What is sharehtml?

An agent runs `deploy`, gets a URL. Re-deploy to update the same URL. People open the link and leave comments, reactions, and see who else is viewing.

- **Artifact kinds**: `html`, `markdown`, `code` (syntax highlighted), and `data` (CSV or JSON rendered as a table, stats, and chart). See [docs/artifact-kinds.md](docs/artifact-kinds.md).
- **Agent interfaces**: CLI, REST API, a `/llms.txt` guide, and WebMCP tools on the homepage.
- **Sharing**: documents are private to the owner by default. `share` makes them viewable by link. `--listed` also shows them on the public homepage. Nothing is listed unless you opt in.
- **Collaboration**: comments, threaded replies, emoji reactions, text anchoring, live presence.
- **Short URLs**: `https://html.duyet.net/d/abcde`.

## Safety model

Uploaded content is untrusted, so the viewer is built to run none of it.

- Scripts and `on*` attributes are stripped. Pages show in a sandboxed iframe (`sandbox=""`), and raw `/d/:id.html` is served with a restrictive CSP (`default-src 'none'`, `sandbox`, `form-action 'none'`).
- Every page is `noindex, nofollow`. User links get `rel="nofollow ugc noopener noreferrer"` and pages send no referrer. `robots.txt` blocks crawlers.
- Uploads are capped (5 MB by default) with per-user document and storage quotas, and Workers rate limits on uploads, writes, views, comments, and reports.
- Anonymous uploads are off when auth is on (Clerk or Access). If an operator enables them, those documents expire.
- Anyone can report a document. Admins listed in `ADMIN_EMAILS` can disable it with `sharehtml admin`.

Details: [docs/security-threat-model.md](docs/security-threat-model.md), [docs/cloudflare-bot-settings.md](docs/cloudflare-bot-settings.md).

## Quick Start
The CLI needs no install. It points at `https://html.duyet.net` by default. Publishing needs an account: run `login` once, or pass an API key.
```bash
npx -y @duyet/sharehtml@latest login
npx -y @duyet/sharehtml@latest deploy my-report.html            # html, md, code, csv, json
npx -y @duyet/sharehtml@latest deploy my-report.html --listed   # also list on the homepage
```
Or use curl with an API key (create one in the dashboard):
```bash
curl -X POST https://html.duyet.net/api/v1/publish \
  -H "Authorization: Bearer shk_..." \
  -H "X-ShareHTML-Client: my-app" \
  -F "file=@my-report.html" \
  -F "title=My Report"
# Returns: { "id": "abcde", "url": "https://html.duyet.net/d/abcde" }
```
## Authentication
sharehtml supports three authentication modes. With `clerk` or `access`, publishing requires sign-in and anonymous uploads are off unless you set `ALLOW_ANONYMOUS_UPLOADS=true`. With `none` (local dev), anyone can publish.
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
| `CLERK_WEBHOOK_SECRET` | Secret | Signing secret for Clerk webhooks (starts with `whsec_`) |
| `ALLOW_ANONYMOUS_UPLOADS` | Var | `"true"` lets unauthenticated users publish when auth is on. Default off. Always on when `AUTH_MODE=none` |
| `ANONYMOUS_TTL_DAYS` | Var | Days before anonymous documents expire. Default `7` |
| `ADMIN_EMAILS` | Var | Comma-separated emails allowed to use `sharehtml admin` (takedowns, reports) |
| `MAX_UPLOAD_BYTES` | Var | Max upload size. Default 5 MB |
| `USER_QUOTA_DOCS` | Var | Max documents per user. Default `500` |
| `USER_QUOTA_BYTES` | Var | Max stored bytes per user. Default 200 MB |

Rate limits use Workers Rate Limiting bindings (`UPLOAD_RATE_LIMITER`, `WRITE_RATE_LIMITER`, `VIEW_RATE_LIMITER`, `WS_RATE_LIMITER`, `COMMENT_RATE_LIMITER`, `REPORT_RATE_LIMITER`) in `apps/worker/wrangler.jsonc`.
### Clerk Webhooks (User Sync)
Configure Clerk webhooks to automatically sync users when they sign up, update profile, or delete account.

**Setup steps:**

1. **Add webhook in Clerk Dashboard:**
   - Go to [dashboard.clerk.com](https://dashboard.clerk.com) → **Webhooks**
   - Click **+ Add endpoint**
   - Enter your webhook URL: `https://<your-domain>/webhooks/clerk`
     - Production: `https://html.duyet.net/webhooks/clerk`
     - Dev: Use ngrok/localtunnel to expose local dev server
   - Click **Create**

2. **Subscribe to events:**
   - Select **user.created** — Creates user in Registry DO on sign up
   - Select **user.updated** — Syncs name/email changes to Registry DO
   - Select **user.deleted** — Removes user from Registry DO on account deletion
   - Click **Update**

3. **Get the webhook secret:**
   - On the webhook endpoint page, copy the **Signing secret** (starts with `whsec_`)
   - Set it as a Wrangler secret:
     ```bash
     npx wrangler secret put CLERK_WEBHOOK_SECRET
     # Paste the whsec_... value
     ```

4. **Test the webhook:**
   - In Clerk Dashboard → Webhooks → Your endpoint
   - Click **Send test webhook** → Select `user.created`
   - Verify response: `{"ok": true}`

**Endpoint URL:** `https://<your-domain>/webhooks/clerk`
**Events:** `user.created`, `user.updated`, `user.deleted`

### CLI Authentication
Run `login` once so the CLI can publish on your behalf.
npx @duyet/sharehtml login
The login flow:
1. CLI displays a URL to visit in your browser
2. Sign in with Clerk (if not already authenticated)
3. Copy the session token from the page
4. Paste it back in the CLI
5. CLI validates the token and stores it locally
> **Note:** Make sure you've set your instance URL first with `npx @duyet/sharehtml config set-url <url>`.
To change authentication mode, run `pnpm run setup` again and select a different option.
## AI Agent Integration
Any agent can use the CLI or REST API. Agents can also read `https://html.duyet.net/llms.txt`. To install the skill for Claude Code, opencode, Codex, and other agents that support skills:
npx -y skills@latest add duyet/sharehtml
The skill teaches agents to:
- Deploy or update documents via CLI using `npx -y @duyet/sharehtml@latest`.
- Perform `diff` before overwriting remote files.
- Pull and review comments/feedback.
- Manage sharing and listing (`share`, `--listed`).
## Self-Hosting
If you want to run your own instance on Cloudflare:
git clone https://github.com/duyet/sharehtml.git
cd sharehtml
pnpm install
npx wrangler login
pnpm run setup
The setup script handles R2 provisioning, Durable Objects, and worker deployment.
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
| `npx @duyet/sharehtml deploy <file>` | Deploy an HTML, Markdown, code, or data (CSV/JSON) file |
| `npx @duyet/sharehtml deploy <file> --listed` | Deploy, share by link, and list on the public homepage |
| `npx @duyet/sharehtml share <id> --listed` / `--unlisted` | Add or remove a shared document from the homepage |
| `npx @duyet/sharehtml admin disable <id> --reason <text>` | Take down a document (admins only); also `enable`, `reports`, `docs` |
| `echo '<html>' \| npx @duyet/sharehtml publish` | Deploy HTML content via stdin pipe |
| `npx @duyet/sharehtml publish '<html>' --content` | Deploy HTML content directly as argument |
| `cat report.html \| curl -X POST https://html.duyet.net/api/v1/publish -H "Authorization: Bearer shk_..." -H "X-ShareHTML-Client: my-app" -F "file=@-;filename=report.html"` | Upload via curl stdin pipe |
| `npx @duyet/sharehtml list` | List your documents |
| `npx @duyet/sharehtml open <id>` | Open a document in the browser |
| `npx @duyet/sharehtml pull <id>` | Download a document locally |
| `npx @duyet/sharehtml diff <file>` | Compare local file against remote |
| `npx @duyet/sharehtml comments <id>` | Show unresolved comments for a document |
| `npx @duyet/sharehtml delete <id>` | Delete a document |
| `npx @duyet/sharehtml share <id>` | Make a document publicly shareable |
| `npx @duyet/sharehtml unshare <id>` | Make a document private again |
| `npx @duyet/sharehtml config set-url <url>` | Set the sharehtml instance URL |

## REST API

You can also use sharehtml directly via HTTP requests. Full API documentation: [https://html.duyet.net/docs#api](https://html.duyet.net/docs#api)

### Quick Start

**Upload** (needs an API key; anonymous upload works only if the operator enables it):
```bash
# 1. Get an API key (requires browser login first):
curl -X POST https://html.duyet.net/api/keys \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=<your-session>" \
  -d '{"name": "curl-scripts"}'
# Returns: { "key": "shk_..." }

# 2. Upload with auth header:
curl -X POST https://html.duyet.net/api/v1/publish \
  -H "X-ShareHTML-Client: my-app" \
  -H "Authorization: Bearer shk_..." \
  -F "file=@report.html" \
  -F "title=My Report"
# Returns: { "id": "...", "url": "https://html.duyet.net/d/..." }
```

### Common Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/publish` | POST | Upload document (canonical). Fields: `file`, `title`, `source`, `sourceKind` (html, markdown, code, data), `listed` |
| `/api/documents` | GET | List your documents |
| `/api/documents/:id` | GET | Get document metadata |
| `/api/documents/:id` | PUT | Update document |
| `/api/documents/:id` | DELETE | Delete document |
| `/api/documents/:id/share` | PUT | Set sharing mode (`{"mode":"link","listed":true}` to list) |
| `/d/:id/report` | POST | Report a document |
| `/llms.txt` | GET | Agent guide |
| `/api/keys` | POST | Create API key |

> **Backward compatibility:** The endpoint `/api/documents` still works for backward compatibility.

See [full API docs](https://html.duyet.net/docs#api) for all endpoints, authentication methods, and examples.

## License
Apache-2.0
---
Original author: [Phillip Jones](https://github.com/jonesphillip)
Fork author: [Duyet Le](https://github.com/duyet)
Production: [html.duyet.net](https://html.duyet.net)
