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

## 2026-05-21: Publish Workflow Registry Auth

- Evidence: remote main commit `940dbae` changed `.github/workflows/publish.yml` to add invalid `package-manager-cache: false` setup-node input and removed `NODE_AUTH_TOKEN` from the `npm publish --access public --provenance` step.
- Risk: publish runs can build successfully but fail at the registry publish step because npm no longer receives `${{ secrets.NPM_TOKEN }}`.
- Fix pattern: do not add setup-node cache inputs to release builds unless caching is intentionally required; keep `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` scoped to the publish step.

## 2026-05-23: CLI upload Blob conversion optimization

- Evidence: `apps/cli/src/api/client.ts` (`prepareDocumentUpload`, `prepareContentUpload`) created an `ArrayBuffer` from `Buffer` for each payload conversion and also created a second conversion for non-text uploads.
- Finding: plain-file upload paths allocated duplicate intermediate buffers unnecessarily (two full copies of payload) before building `sourceBlob` and `renderedBlob`.
- Follow-up: the CLI `tsc` gate rejects `Uint8Array<ArrayBufferLike>` as `BlobPart`, so the safe optimization here is one sliced `ArrayBuffer` per upload reused across both blobs.
- Fix pattern: reuse one typed `ArrayBuffer` payload per upload when rendering path does not alter bytes, then verify with the CLI typecheck before merging.
- Check command: `pnpm --filter @duyet/sharehtml run typecheck` and CLI upload tests (if available) after CLI changes.

## 2026-06-01: Homepage analytics metric semantics

- Evidence: `apps/worker/src/durable-objects/registry.ts` computes `todayViews` with `SELECT COUNT(*) FROM views WHERE date(last_viewed_at) = date('now')`, while view events increment `documents.view_count` separately via `UPDATE documents SET view_count = COALESCE(view_count, 0) + 1`.
- Finding: the homepage metric counts unique `views` rows touched today (effectively active viewer-document pairs or viewed docs), not total view events for today.
- Fix pattern: do not label that metric as raw "Views today" unless an event-log-based counter exists; prefer wording like `Docs viewed today`.

## 2026-06-05: Public Clerk homepage analytics leak

- Evidence: `apps/worker/src/index.ts` renders `/` for Clerk visitors even when `authUser.id === "unauthenticated"`, and the 2026-05-31 analytics feature called `registry.getHomeAnalytics()` unconditionally.
- Risk: unauthenticated visitors could see global `users` and `storage` KPIs even though those values describe private tenant usage.
- Fix pattern: pass the authenticated state into `getHomeAnalytics()`, omit private metrics at the data boundary, and keep the homepage rendering limited to public KPIs for unauthenticated Clerk traffic.
- Regression test: `WRANGLER_LOG_PATH=/tmp/wrangler-logs pnpm test`
## Recurring Review Rules

- Put recurring code-smell and dead-code lessons here, then list them in `memory/MEMORY.md`.
- Do not add dated `docs/reviews/code-smell-dead-code-*.md` reports.
- Only call code dead when repo-wide reference search finds zero non-test references.
- Run `pnpm --filter @duyet/sharehtml run typecheck` after dependency changes; the root `pnpm typecheck` currently covers the worker package only.

## 2026-07-10: Vitest file-parallelism pool timeouts (flaky CI-local)

- Evidence: `pnpm test` (default) intermittently fails 4 unrelated tests with `Test timed out in 5000ms` on health/sharing/api-keys/api — while the same suite passes cleanly with `pnpm exec vitest run --no-file-parallelism` (79/79).
- Root cause: the `@cloudflare/vitest-pool-workers` pool contends under file-level parallelism on this machine, causing worker bootstrap timeouts rather than real assertion failures.
- Fix pattern: run the worker test suite with `--no-file-parallelism` for a stable local gate; do not trust default-parallel timeouts as regressions.
