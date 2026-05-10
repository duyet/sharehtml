---
name: clerk-integration-lessons
description: Lessons learned from Clerk JavaScript integration issues
type: project
---

# Clerk JavaScript Integration - Lessons Learned

## Issues Found and Fixed

### 1. Version Mismatch
**Problem:** jsx.tsx loaded `@clerk/clerk-js@6` while client code imported `@clerk/clerk-js@5`
**Fix:** Use single version (v5) in ESM import, remove redundant script tags

### 2. CSP Blocking ESM Imports
**Problem:** ESM modules use `script-src` not `connect-src`
**Fix:** Add `https://cdn.jsdelivr.net` to BOTH `script-src` AND `connect-src`

### 3. CSP Blocking Blob Workers
**Problem:** Clerk creates blob workers for token polling, CSP blocked them
**Fix:** Add `worker-src 'self' blob:` to CSP
**Error:** `Creating a worker from 'blob:...' violates the following Content Security Policy directive: "script-src ...". Note that 'worker-src' was not explicitly set, so 'script-src' is used as a fallback.`

### 4. Modal Dialogs Showing by Default
**Problem:** `.modal-backdrop` had `display: flex` but `.hidden` class was undefined
**Fix:** Add `.hidden { display: none !important; }` to shared.css
**Error:** Modals appeared on page load instead of being hidden

### 5. No Loading State
**Problem:** User sees empty space while Clerk loads
**Fix:** Show "..." during load, then replace with button or avatar

### 4. Silent Failures
**Problem:** Clerk load failures showed no feedback
**Fix:** Add fallback `/login` link + console error logging

## Prevention Strategy

### Before Deploy
1. **CSP Validation** → Test CSP allows all required domains
2. **ESM Import Test** → Verify module loads in browser console
3. **Auth Flow Test** → Complete sign-in/sign-out flow

### Code Review Checklist
- [ ] Single Clerk version throughout codebase
- [ ] CSP includes ESM domain in script-src AND connect-src
- [ ] CSP includes worker-src with blob: for token polling
- [ ] Loading state for async operations
- [ ] Error handling with fallback UI
- [ ] Console logging for debugging
- [ ] Modal dialogs have hidden class by default
- [ ] CSS utility classes properly defined

### Monitoring
- Check deployed site after each push
- Test auth flow manually
- Monitor console for errors
- Use browser DevTools Network tab to verify imports

## Technical Details

### Working Implementation
```javascript
// ESM import (not window.Clerk)
const Clerk = (await import("https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.mjs")).default;
const clerk = new Clerk(publishableKey);
await clerk.load();

// Check auth state
if (clerk.user) {
  clerk.mountUserButton(node);  // Shows avatar
} else {
  // Show sign-in button or open modal
}
```

### CSP Requirements
```
script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://clerk.yourdomain.com
connect-src 'self' wss: https://cdn.jsdelivr.net https://clerk.yourdomain.com
worker-src 'self' blob:
```

## Files Modified
- `src/frontend/jsx.tsx` - Removed redundant script tags
- `src/utils/csp.ts` - Added jsdelivr to script-src, blob: to worker-src
- `src/client/shared.css` - Added `.hidden { display: none !important; }`
- `src/client/home-client.ts` - ESM import + loading state + error handling
- `src/client/dashboard-client.ts` - ESM import + loading state + error handling
