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
| `npx @duyet/sharehtml list` | List your documents |
| `npx @duyet/sharehtml open <id>` | Open a document in the browser |
| `npx @duyet/sharehtml pull <id>` | Download a document locally |
| `npx @duyet/sharehtml diff <file>` | Compare local file against the deployed version |
| `npx @duyet/sharehtml comments <id>` | Show unresolved comments for a document |
| `npx @duyet/sharehtml delete <id>` | Delete a document |
| `npx @duyet/sharehtml config set-url <url>` | Set the sharehtml URL |

## Self-Hosting

See the main repository for self-hosting instructions:
https://github.com/duyet/sharehtml
