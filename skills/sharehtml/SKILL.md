---
name: sharehtml
description: >
  Deploy, update, and manage HTML, Markdown, and code documents on sharehtml (https://html.duyet.net).
  Supports reviewing comments, diffing local changes, and managing sharing permissions.
  Use when asked to: (1) Deploy or update a document, (2) Share or unshare a document,
  (3) Pull a remote document locally, (4) Review and address feedback/comments,
  or (5) List and find existing documents.
---

## Setup

Ensure the CLI is configured to the production instance:
```bash
npx -y sharehtml@latest config set-url https://html.duyet.net
```

## Workflows

### Deploy or Update
1. Verify the file format is supported (`.html`, `.md`, `.json`, or source code).
2. Run `npx -y sharehtml@latest deploy <file>`.
3. If overwriting, run `npx -y sharehtml@latest diff <file>` first, summarize changes, and ask for confirmation.
4. Keep documents private by default. Only run `sharehtml share` if explicitly requested.

### Address Feedback
1. Find the document ID using `npx -y sharehtml@latest list` or a URL.
2. Review comments: `npx -y sharehtml@latest comments <id> --json`.
3. Pull content: `npx -y sharehtml@latest pull <id>`.
4. Apply changes, `diff`, and `deploy` after approval.

## Key Commands

- `npx -y sharehtml@latest deploy <file>` — Deploy or update
- `npx -y sharehtml@latest diff <file>` — Compare local vs remote
- `npx -y sharehtml@latest pull <id>` — Download remote file
- `npx -y sharehtml@latest comments <id> --json` — Read unresolved feedback
- `npx -y sharehtml@latest list` — Search documents by title/filename
- `npx -y sharehtml@latest share <id>` — Make publicly shareable
- `npx -y sharehtml@latest unshare <id>` — Revert to private

## Safety Rules

- **Opt-in Sharing**: Only use `sharehtml share` if the user says "share this". "Deploy" or "upload" implies private.
- **Human Diffs**: Summarize diffs in plain language; do not dump raw patches unless requested.
- **Ambiguity**: If `list` returns multiple matches, ask the user to specify.
