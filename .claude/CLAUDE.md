# sharehtml - Claude Code Configuration

This file configures Claude Code behavior for the sharehtml project.

## Babysit PR Workflow

When creating a pull request, always **babysit** it until merged:

1. **Watch** - Monitor PR for review comments (CodeRabbit, humans)
2. **Read** - Carefully read all code review feedback
3. **Fix** - Address ALL issues raised:
   - Syntax/lint issues
   - Logic bugs
   - Security concerns
   - Style inconsistencies
   - Missing edge cases
4. **Update** - Push fixes to the PR branch
5. **Verify** - Ensure CI passes after fixes
6. **Merge** - Only merge when PR is good to merge
7. **Clean** - Remove worktree if used

### Commands

```bash
# Watch PR status
gh pr view <number>

# Check CI status
gh pr checks <number>

# Read review comments
gh pr view <number> --comments

# Merge when ready
gh pr merge <number> --squash --admin
```

### Auto-Trigger

After any PR creation (`/cp`, `/cpr`, or `gh pr create`), immediately start babysitting.

## Project-Specific Patterns

- **Auth modes**: `none` (dev/public), `clerk` (production with accounts), `access` (corporate)
- **Monorepo**: `apps/worker`, `apps/cli`
- **Deployment**: Cloudflare Workers with Wrangler
- **Storage**: R2 for HTML, Durable Objects for metadata
- **Clerk webhooks**: `/webhooks/clerk` endpoint syncs users on `user.created` and `user.signedIn` events

## Quality Standards

- Build for 10,000+ users: sustainable, maintainable, zero technical debt
- Never create compatibility shims or workarounds
- If something isn't wired yet, keep UX surface intact—stub or annotate
- Test end-to-end: build passes, lint clean, manual verify
