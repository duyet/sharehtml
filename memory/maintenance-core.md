---
name: maintenance-core
description: Durable maintenance findings and commands for recurring code-smell scans
type: project
---

# Maintenance Core Memory

## 2026-05-21: Deploy Workflow Toolchain

- Evidence: main run `26147353018` failed after merge `885f29b` in `.github/workflows/deploy.yml` at the `cloudflare/wrangler-action@v3` deploy step.
- Root cause: the workflow used Node 20, while local `wrangler@4.92.0` requires Node 22. The action then tried to install fallback `wrangler@3.90.0` with npm and failed on workspace dependencies.
- Fix pattern: keep deploy workflows on Node 22 and pnpm 10, matching the succeeding `Deploy Worker` workflow.
- Log command: use `XDG_CACHE_HOME=/tmp/gh-cache gh run view <run-id> --log-failed` if the default GitHub CLI cache path is blocked.
- Local check command: use `WRANGLER_LOG_PATH=/tmp/wrangler-logs` for `pnpm test` or `pnpm build` if Wrangler cannot write logs under `~/Library/Preferences`.

## Recurring Review Rules

- Put recurring code-smell and dead-code lessons here, then list them in `memory/MEMORY.md`.
- Do not add dated `docs/reviews/code-smell-dead-code-*.md` reports.
- Only call code dead when repo-wide reference search finds zero non-test references.
- Run `pnpm --filter @duyet/sharehtml run typecheck` after dependency changes; the root `pnpm typecheck` currently covers the worker package only.
