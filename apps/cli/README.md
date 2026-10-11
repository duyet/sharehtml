# @duyet/sharehtml

Bun CLI for deploying local documents to [sharehtml](https://html.duyet.net) for collaborative commenting.
## Quick Start
You can use the CLI instantly without manual installation. It is pre-configured to use `https://html.duyet.net` by default. **Publishing requires login or an API key.** Anonymous upload is off by default on servers with sign-in and works only if the operator sets `ALLOW_ANONYMOUS_UPLOADS=true`.
```bash
# log in once, then deploy a file
npx -y @duyet/sharehtml@latest login
npx -y @duyet/sharehtml@latest deploy my-report.html
```
Or use curl to hit the API directly:
```bash
curl -X POST https://html.duyet.net/api/v1/publish \
  -H "Authorization: Bearer shk_..." \
  -H "X-ShareHTML-Client: my-app" \
  -F "file=@my-report.html" \
  -F "title=My Report"
# Returns: { "id": "abcde", "url": "https://html.duyet.net/d/abcde" }
```
## AI Agent Integration
Works with Claude Code, opencode, Codex, or any agent that can run shell commands. Agents can also read `/llms.txt` on your server. Add the skill with `sharehtml` capabilities:
npx -y skills@latest add duyet/sharehtml
## Common Commands
| Command | Description |
|---------|-------------|
| `npx @duyet/sharehtml deploy <file>` | Deploy an HTML, Markdown, code, or data (CSV/JSON) file |
| `echo '<html>' \| npx @duyet/sharehtml publish` | Deploy HTML content via stdin pipe |
| `npx @duyet/sharehtml publish --content '<html>'` | Deploy HTML content directly as argument |
| `cat report.html \| curl -X POST https://html.duyet.net/api/v1/publish -H "X-ShareHTML-Client: my-app" -F "file=@-;filename=report.html"` | Upload via curl stdin pipe |
| `npx @duyet/sharehtml list` | List your documents |
| `npx @duyet/sharehtml open <id>` | Open a document in the browser |
| `npx @duyet/sharehtml pull <id>` | Download a document locally |
| `npx @duyet/sharehtml diff <file>` | Compare local file against the deployed version |
| `npx @duyet/sharehtml comments <id>` | Show unresolved comments for a document |
| `npx @duyet/sharehtml delete <id>` | Delete a document |
| `npx @duyet/sharehtml deploy <file> --listed` | Share by link and list the document on the public homepage (unlisted by default) |
| `npx @duyet/sharehtml share <id> --listed` / `--unlisted` | Add or remove a shared document from the public homepage |
| `npx @duyet/sharehtml admin disable <id> --reason phishing` | Take down a document (admins in `ADMIN_EMAILS` only); also `admin enable`, `admin reports`, `admin docs` |
| `npx @duyet/sharehtml config set-url <url>` | Set the sharehtml URL |

## HTTP API

The CLI wraps a REST API that you can call directly with curl or any HTTP client:

```bash
# Anonymous upload (only on servers without auth, or with ALLOW_ANONYMOUS_UPLOADS=true)
curl -X POST https://html.duyet.net/api/v1/publish \
  -H "X-ShareHTML-Client: my-app" \
  -F "file=@report.html" \
  -F "title=My Report"

# Upload using an API key
curl -X POST https://html.duyet.net/api/v1/publish \
  -H "X-ShareHTML-Client: my-app" \
  -H "Authorization: Bearer shk_..." \
  -F "file=@report.html" \
  -F "title=My Report"
```

> **Backward compatibility:** The endpoint `/api/documents` still works for backward compatibility.

Full API reference: [https://html.duyet.net/docs#api](https://html.duyet.net/docs#api)

## Self-Hosting
See the main repository for self-hosting instructions:
https://github.com/duyet/sharehtml
## Optional Features

### Authentication (Advanced)

Instances without auth accept anonymous uploads. Instances with Clerk or Cloudflare Access disable anonymous uploads unless the operator sets `ALLOW_ANONYMOUS_UPLOADS=true`; anonymous documents then expire after 7 days. Run `login` to publish to an instance that has authentication enabled (Clerk or Cloudflare Access).

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
