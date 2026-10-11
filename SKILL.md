---
name: sharehtml
description: "Publish HTML, Markdown, code, and CSV/JSON files to a sharehtml registry and get a link people can comment on. Works with Claude Code, opencode, Codex, or any agent that can run a shell command."
---

## Setup

The CLI points at `https://html.duyet.net` by default. Publishing needs an account, so log in once (it stores an API key):

```bash
npx -y @duyet/sharehtml@latest login
```

On a server with sign-in (Clerk or Access), anonymous upload is off unless the operator sets `ALLOW_ANONYMOUS_UPLOADS=true`. For CI or headless agents, use an API key (`Authorization: Bearer shk_...`) with the REST API. Agent guide: `https://html.duyet.net/llms.txt`.

## Artifact kinds

| Kind | Files |
|------|-------|
| `html` | `.html`, `.htm` (scripts are stripped) |
| `markdown` | `.md` |
| `code` | `.ts`, `.py`, `.go`, ... (syntax highlighted) |
| `data` | `.csv`, `.json` (table, stats, chart) |

## Key Commands

- `npx -y @duyet/sharehtml@latest deploy <file> --title "..."` — publish or update
- `npx -y @duyet/sharehtml@latest deploy <file> --listed` — also list on the public homepage (unlisted by default)
- `echo '<html>' | npx -y @duyet/sharehtml@latest publish --title "..."` — publish from stdin (`--type markdown|code|data` for other kinds)
- `npx -y @duyet/sharehtml@latest diff <file>` — compare local vs remote
- `npx -y @duyet/sharehtml@latest pull <id>` — download the source
- `npx -y @duyet/sharehtml@latest list` — list your documents
- `npx -y @duyet/sharehtml@latest share <id> [--listed|--unlisted]` — share by link; `unshare <id>` to make private
- `npx -y @duyet/sharehtml@latest comments <id>` — read unresolved comments

## Tips for agents

1. Report the URL to the user right after publishing.
2. Pass `--title`. Write generated content to a file and `deploy` it; it is more reliable than long pipes.
3. Only use `--listed` when the user asks to make a document public. Treat uploads as public-by-link once shared.
4. Never upload secrets. Pages are `noindex`, but links can be forwarded.
5. Uploads are capped (5 MB default). Hit a 401 or `auth_required`? Run `login` or ask the user for an API key.
