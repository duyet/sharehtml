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
