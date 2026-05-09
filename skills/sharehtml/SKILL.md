---
name: sharehtml
description: "Deploy and manage HTML/Markdown documents on html.duyet.net with collaborative commenting."
---

## Setup

Ensure the CLI is configured:
```bash
npx -y sharehtml@latest config set-url https://html.duyet.net
```

## Key Commands

- `npx -y sharehtml@latest deploy <file>` — Deploy or update
- `npx -y sharehtml@latest diff <file>` — Compare local vs remote
- `npx -y sharehtml@latest pull <id>` — Download remote file
- `npx -y sharehtml@latest list` — Search documents
