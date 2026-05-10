# @duyet/sharehtml

Bun CLI for deploying local documents to [sharehtml](https://html.duyet.net) for collaborative commenting.
## Quick Start
You can use the CLI instantly without manual installation. It is pre-configured to use `https://html.duyet.net` by default. **No authentication is required to upload files.**
```bash
# deploy a file — no login needed
npx -y @duyet/sharehtml@latest deploy my-report.html
```
Or use curl to hit the API directly:
```bash
curl -X POST https://html.duyet.net/api/documents \
  -F "file=@my-report.html" \
  -F "title=My Report"
# Returns: { "id": "abcde", "url": "https://html.duyet.net/d/abcde" }
```
## AI Agent Integration
Enhance your AI assistant (like Claude Code) with `sharehtml` capabilities:
npx -y skills@latest add duyet/sharehtml
## Common Commands
| Command | Description |
|---------|-------------|
| `npx @duyet/sharehtml deploy <file>` | Deploy an HTML, Markdown, or code file |
| `echo '<html>' \| npx @duyet/sharehtml publish` | Deploy HTML content via stdin pipe |
| `npx @duyet/sharehtml publish --content '<html>'` | Deploy HTML content directly as argument |
| `cat report.html \| curl -X POST https://html.duyet.net/api/documents -F "file=@-;filename=report.html"` | Upload via curl stdin pipe |
| `npx @duyet/sharehtml list` | List your documents |
| `npx @duyet/sharehtml open <id>` | Open a document in the browser |
| `npx @duyet/sharehtml pull <id>` | Download a document locally |
| `npx @duyet/sharehtml diff <file>` | Compare local file against the deployed version |
| `npx @duyet/sharehtml comments <id>` | Show unresolved comments for a document |
| `npx @duyet/sharehtml delete <id>` | Delete a document |
| `npx @duyet/sharehtml config set-url <url>` | Set the sharehtml URL |

## HTTP API

The CLI wraps a REST API that you can call directly with curl or any HTTP client:

```bash
# Upload (no auth needed)
curl -X POST https://html.duyet.net/api/documents \
  -F "file=@report.html" \
  -F "title=My Report"

# Upload using API key (for authenticated instances)
curl -X POST https://html.duyet.net/api/documents \
  -H "Authorization: Bearer shk_..." \
  -F "file=@report.html" \
  -F "title=My Report"
```

Full API reference: [https://html.duyet.net/docs#api](https://html.duyet.net/docs#api)

## Self-Hosting
See the main repository for self-hosting instructions:
https://github.com/duyet/sharehtml
## Optional Features

### Authentication (Advanced)

Uploading files does not require authentication. The `login` command is only needed when connecting to a self-hosted instance that has authentication enabled (Clerk or Cloudflare Access), and you want access to advanced features like persistent dashboards or private documents.

```bash
npx @duyet/sharehtml login
```

> **Note:** Make sure you've set your instance URL first with `npx @duyet/sharehtml config set-url <url>`.

#### Clerk Authentication

When your instance uses Clerk:

1. Visit the displayed URL in your browser (opens `/cli-token`)
2. Sign in with Clerk (if prompted)
3. Copy the session token shown on the page
4. Paste it back in your terminal

The CLI validates the token with the `/api/auth/verify` endpoint and stores it locally for future requests.

#### Detection

The CLI automatically detects which authentication method your instance uses (Clerk, Cloudflare Access, or none) and prompts accordingly.
