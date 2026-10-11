# sharehtml - Agent Coordination

Guidelines for AI agents working on the sharehtml codebase.

## Standard Workflows

### Babysit PR (After PR Creation)

Every PR must be babysat until merge:

```
CREATE PR → WATCH → READ REVIEWS → FIX ISSUES → UPDATE → VERIFY → MERGE
```

**Agents involved:**
- **Creator** - Creates PR, hands off to Babysit
- **Babysit** - Watches PR, reads reviews, fixes issues, merges

**Process:**
1. Creator: `gh pr create` → Report PR URL
2. Babysit: Monitor with `gh pr checks`, `gh pr view --comments`
3. Babysit: Read ALL review comments (CodeRabbit, humans)
4. Babysit: Fix issues in worktree or on branch
5. Babysit: Push fixes `git push`
6. Babysit: Re-verify CI passes
7. Babysit: Merge `gh pr merge --squash --admin`
8. Babysit: Clean worktree if used

**Never auto-merge without reading reviews.** Code review bots catch real issues.

### Feature Development

```
RESEARCH → PLAN → IMPLEMENT → TEST → PR → BABYSIT → MERGE
```

1. **Explore agents** (parallel) - Research codebase patterns
2. **Plan agent** - Design implementation approach
3. **Implement agents** (parallel worktrees) - Build features
4. **Test agent** - Verify build, lint, e2e
5. **PR agent** - Create pull request
6. **Babysit agent** - Watch, fix, merge

### Hotfix Pipeline

```
IDENTIFY → FIX → VERIFY → PR → BABYSIT → MERGE
```

Skip plan mode for obvious fixes. Always babysit.

## Agent Types

| Agent | Role | Tools |
|-------|------|-------|
| **Explore** | Codebase research, find patterns | Read, Grep, Bash (find/grep) |
| **Plan** | Design implementation, assess tradeoffs | All tools (read-only) |
| **Senior** | Complex implementation, features | All tools |
| **Junior** | Simple tasks, clear specs | All tools |
| **Review** | Code review, bug detection | Read, Grep, analyze |
| **Babysit** | Watch PR, fix review issues | gh, Read, Edit, Bash (git) |

## Coordination Rules

- **Parallel execution** - Launch independent agents in single message
- **Worktree isolation** - Each agent gets own worktree for parallel work
- **No build in workers** - Skip `bun build` in parallel agents; verify once after merge
- **Handoff清晰** - Report PR URL, agent switch explicit

## Context Management

- **Save to memory** - Before context compaction
- **Delegate to sub-agents** - When context nears limit
- **Use Explore agents** - For codebase research, not direct grep

## Quality Gates

Every PR must pass:
1. **Build** - `pnpm install` succeeds
2. **Lint** - No lint errors (auto-fix if possible)
3. **Tests** - Unit tests pass (if exist)
4. **Review** - All review comments addressed
5. **E2E** - Manual verification of changes

Only then merge.

## Maintenance Memory

- Update `memory/maintenance-core.md` and `memory/MEMORY.md` for recurring code-smell and dead-code findings.
- Keep unauthenticated Clerk homepage analytics limited to public KPIs; do not expose total users or storage on `/`.
- Do not create dated `docs/reviews/code-smell-dead-code-*.md` reports.
- Keep deploy workflows on Node 22 and pnpm 10; current Wrangler requires Node 22.
- Keep `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` on the publish workflow's `npm publish` step; do not add setup-node cache inputs to release builds unless caching is intentionally required.
- Run `pnpm --filter @duyet/sharehtml run typecheck` after CLI dependency or API-client changes; root `pnpm typecheck` covers the worker only.
- Homepage analytics `todayViews` comes from `views.last_viewed_at` rows, so label it as `Docs viewed today` rather than raw `Views today` unless an event-log counter is added.
- Use `XDG_CACHE_HOME=/tmp/gh-cache` when `gh run view --log-failed` cannot write to the default cache.
- Use `WRANGLER_LOG_PATH=/tmp/wrangler-logs` when local Wrangler-backed checks like `pnpm test` cannot write logs under `~/Library/Preferences`.

## Registry Patterns

- **Artifact kinds**: `html`, `markdown`, `code`, `data` (CSV/JSON). Source of truth: `docs/artifact-kinds.md`. `data` is always rendered by the worker (`src/utils/data-render.ts`), never by the client. A new kind needs worker render, CLI `--type` support, and a docs update.
- **Paper design system**: colors, fonts, and spacing are tokens in `apps/worker/src/client/theme.css` (see `DESIGN.md`). No hardcoded colors in CSS or TSX; use `var(--...)` tokens.
- **Safety invariants** (never weaken; tests in `apps/worker/tests` and `e2e/viewer-security.spec.ts` cover them):
  - Keep the sandboxed script-free viewer and the raw-page CSP; do not add `allow-scripts` or `allow-same-origin`.
  - All user links get `rel="nofollow ugc noopener noreferrer"`; pages send no referrer.
  - `noindex, nofollow` everywhere; `/llms.txt` is a usage guide and never lists documents.
  - Listing is opt-in (`listed` needs link sharing). Anonymous documents are never listed.
  - Privacy: private documents and tenant totals must not leak to unauthenticated visitors.
  - Anonymous uploads are off by default when auth is on (`ALLOW_ANONYMOUS_UPLOADS`).
- **pnpm 11**: pnpm settings (`allowBuilds`, `overrides`, `minimumReleaseAge`) live in `pnpm-workspace.yaml`, not `package.json`.
- **Vitest flake**: on a busy machine the worker pool can hit `Test timed out in 5000ms` on cold start. Rerun with fewer workers (`npx vitest run --maxWorkers=2` in `apps/worker`) before treating it as a regression.
- **E2E**: `pnpm test:e2e` builds and serves the worker with `vite preview` (the worker reads the Vite asset manifest, which `vite dev` lacks).
