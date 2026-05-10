# @duyet/sharehtml

Bun CLI for deploying local documents to [sharehtml](https://html.duyet.net) for collaborative commenting.

## Quick Start

You can use the CLI instantly without manual installation. It is pre-configured to use `https://html.duyet.net` by default:

```bash
# deploy a file
npx -y @duyet/sharehtml@latest deploy my-report.html
```

## AI Agent Integration

Enhance your AI assistant (like Claude Code) with `sharehtml` capabilities:

```bash
npx -y skills@latest add duyet/sharehtml
```

## Common Commands

| Command | Description |
|---------|-------------|
| `npx @duyet/sharehtml deploy <file>` | Deploy an HTML, Markdown, or code file |
| `echo '<html>' \| npx @duyet/sharehtml publish` | Deploy HTML content via stdin pipe |
| `npx @duyet/sharehtml publish --content '<html>'` | Deploy HTML content directly as argument |
| `npx @duyet/sharehtml list` | List your documents |
| `npx @duyet/sharehtml list` | List your documents |
| `npx @duyet/sharehtml open <id>` | Open a document in the browser |
| `npx @duyet/sharehtml pull <id>` | Download a document locally |
| `npx @duyet/sharehtml diff <file>` | Compare local file against the deployed version |
| `npx @duyet/sharehtml comments <id>` | Show unresolved comments for a document |
| `npx @duyet/sharehtml delete <id>` | Delete a document |
| `npx @duyet/sharehtml login` | Authenticate with your sharehtml instance |
| `npx @duyet/sharehtml config set-url <url>` | Set the sharehtml URL |

## Self-Hosting

See the main repository for self-hosting instructions:
https://github.com/duyet/sharehtml

## Authentication

The `login` command authenticates you with a self-hosted sharehtml instance that requires authentication.

> **Note:** Make sure you've set your instance URL first with `npx @duyet/sharehtml config set-url <url>`.

### Clerk Authentication

When your instance uses Clerk:

1. Run `npx @duyet/sharehtml login`
2. Visit the displayed URL in your browser (opens `/cli-token`)
3. Sign in with Clerk (if prompted)
4. Copy the session token shown on the page
5. Paste it back in your terminal

The CLI validates the token with the `/api/auth/verify` endpoint and stores it locally for future requests.

### Detection

The CLI automatically detects which authentication method your instance uses (Clerk, Cloudflare Access, or none) and prompts accordingly.
