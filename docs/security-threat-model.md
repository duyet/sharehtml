# sharehtml security threat model

Scope: `apps/worker` on branch `feat/agent-discovery` (2026-10-11). Paths below are relative to `apps/worker/src/`.
Risk: H = likely abuse with real impact, M = plausible or bounded impact, L = defense-in-depth.

## Trust boundaries

| Surface | Content origin | Isolation today |
|---|---|---|
| `/d/:id` shell | first-party | CSP from `utils/csp.ts:16-51`, `script-src 'unsafe-inline'` |
| `/d/:id/content` -> `iframe.srcdoc` | uploader | `sandbox=""` (`frontend/shell.tsx:106-111`), HTMLRewriter sanitizer (`utils/sanitize-html.ts`) |
| `/d/:id.html` raw | uploader | top-level on the app origin, CSP `default-src 'none'` (`routes/viewer.ts:56-64`), **no sanitizer, no sandbox** |
| Dashboard previews | uploader | `<iframe sandbox="allow-scripts" src="/d/:id.html">` (`client/dashboard-client.ts:82-87`) |
| `/llms.txt` | uploader titles | plain text, no escaping (`index.ts:71-86`) |
| Comments / presence | any viewer | Document DO websocket (`durable-objects/document.ts:243-249`) |

## 0. Priority: no backlinks, no referrers, no crawlers (user requirement)

Hosting arbitrary HTML is dangerous; hosted artifacts must give no SEO value, leak no referrers, and not be crawled.

| Item | Current state | Risk | Recommendation | Effort |
|---|---|---|---|---|
| Links in rendered content | Sanitizer leaves `<a>` untouched apart from `javascript:` (`utils/sanitize-html.ts:23`); markdown output unmodified (`utils/markdown.ts:69`); raw `.html` unsanitized | **H** | HTMLRewriter `a[href]`, `area[href]` handler: set `rel="nofollow ugc noopener noreferrer"`, `target="_blank"`, `referrerpolicy="no-referrer"`; apply in `/content` and in markdown/data render at publish; for raw `.html` also run the rewriter | S |
| Referrer-Policy | None on any response; only `window.open(...,"noopener,noreferrer")` in `client/shell-client.ts:690-712` | **H** | `Referrer-Policy: no-referrer` on `/d/:id`, `/d/:id/content`, `/d/:id.html`, `/d/:id/source`; inject `<meta name="referrer" content="no-referrer">` at top of srcdoc `<head>` (srcdoc inherits parent policy, the meta makes it explicit) | S |
| X-Robots-Tag | Not set anywhere; shell says `<meta name="robots" content="all">` (`frontend/shell.tsx:41`) | **H** | Global middleware in `index.ts`: `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` on all responses; change meta to `noindex, nofollow` | S |
| Public listing on `/` | Homepage lists recent link-shared docs | **H** | Same header + `rel="nofollow ugc"` on listed links; with no-crawler policy the homepage is noindex too | S |
| robots.txt | Missing (`apps/worker/public/` has only `favicon.svg`, `templates/`) | **H** | Serve `User-agent: *\nDisallow: /`. Tension: `/llms.txt` is for agent discovery. Recommendation: disallow everything, including `/llms.txt`; robots is advisory and agents invoked by a user fetch directly anyway. Keep `/llms.txt` as docs/API usage only (no doc listing, see item 2 of the action list) | S |
| Bots | No bot controls in repo | M | Cloudflare dashboard: Bot Fight Mode on, "Block AI Scrapers and Crawlers" on, WAF custom rule `cf.client.bot` / verified-bot category -> block on `/d/*`, managed challenge on `/` | S (config) |

## 1. XSS and content injection

| Vector | Current state | Risk | Recommendation | Effort |
|---|---|---|---|---|
| Script in viewer iframe | `sandbox=""` blocks scripts, forms, top navigation, popups; srcdoc gets an opaque origin. Sanitizer strips `<script>`, `on*`, `javascript:` href/src (`utils/sanitize-html.ts:1-53`) | L | Keep `sandbox=""` as the real control. Add a test that asserts the attribute never gains `allow-same-origin` + `allow-scripts` together | S |
| Sanitizer gaps (SVG `<animate href>`, `xlink:href`, `formaction`, `action`, `srcdoc`, `<meta http-equiv=refresh>`, `<base>`, `<object>/<embed>`, `data:text/html`, `vbscript:`) | Only `href`/`src` with `javascript:` are checked (`sanitize-html.ts:23`); entity-encoded `java&#x09;script:` passes the regex | L in iframe (sandbox), **M** if sanitizer is ever reused outside the sandbox | Treat the sanitizer as defense in depth only; extend to drop `meta[http-equiv]`, `base`, `object`, `embed`, `form`, `iframe[srcdoc]`, and check all URL-bearing attributes (`action`, `formaction`, `xlink:href`, `poster`, `data`) | S |
| Raw `/d/:id.html` | Unsanitized uploader HTML served as top-level page on the trusted origin. CSP `default-src 'none'` blocks script, but `form-action`, `navigate-to`, `frame-ancestors`, `base-uri` are not covered by `default-src`. `<meta http-equiv=refresh content="0;url=https://evil">` and `<form action="https://evil">` both work (`routes/viewer.ts:44-65`) | **H** (phishing, open redirect) | Add `sandbox` CSP directive (no tokens, or `allow-popups`), `form-action 'none'`, `base-uri 'none'`, `frame-ancestors 'self'`. Better: serve raw HTML from a separate user-content domain (e.g. `*.sharehtml-usercontent.dev`) | S (headers) / M (domain) |
| CSS exfiltration | Inline styles allowed in iframe and raw page; `img-src data:` only on raw; srcdoc iframe inherits shell CSP (`img-src 'self' data:`, `connect-src wss:` etc.) | L | Nothing secret is inside the document frame; no action beyond the raw-page CSP above | - |
| Markdown | `marked` output is not sanitized (`utils/markdown.ts:69`), raw HTML passes through; only protected by the same iframe/raw-page controls | M (same as raw HTML) | Fixed by the raw-page CSP; optionally disable raw HTML in markdown | S |
| CSV / JSON render | All cells, headers, titles and parse errors escaped (`utils/data-render.ts:206, 280-285, 335-340, 385`) | L | Keep; add a fuzz test with `<script>` in headers | S |
| `/d/:id/content` | Sent as `attachment` with nosniff (`routes/viewer.ts:140-144`, `utils/download.ts:14-16`), requires viewer capability token | L | None | - |
| Shell CSP | `script-src 'unsafe-inline'` + `https://cdn.jsdelivr.net` (whole CDN) (`utils/csp.ts:22-29`); `connect-src wss:` any host | M | Move inline scripts to hashed/nonce'd, pin jsdelivr path, restrict `wss:` to `'self'` | M |

## 2. Phishing, scams, malware

| Vector | Current state | Risk | Recommendation | Effort |
|---|---|---|---|---|
| Credential-harvest form on trusted domain | Raw `.html` renders any form; `form-action` unset (see above). Anonymous uploads allowed and auto-shared (`routes/api.ts:475-487`, `is_shared: !authenticated ? 1` near `api.ts:550`) | **H** | CSP `form-action 'none'` + `sandbox`; user-content domain; "Uploaded by a user, not sharehtml" banner on the shell | S |
| Brand impersonation | No title/content checks; custom slug lets attacker pick URL like `/d/paypal-login` (`api.ts:493, 514`, `utils/ids.ts:12-24`) | **H** | Reserve/deny-list slugs (brand words, `login`, `verify`, `account`), require auth for custom slugs | S |
| Open-redirect-like links | Viewer opens clicked links in new tab with `noopener,noreferrer` (`client/shell-client.ts:690-712`); raw page meta-refresh redirects silently | M | Interstitial "You are leaving sharehtml" for external links; fix meta refresh via CSP `sandbox` | S |
| Malware download | Source download is `attachment` with original filename (`utils/download.ts:14`). Upload accepts any file body, no type check | M | Allow-list extensions (`.html .md .csv .json` + code), reject binaries by magic bytes, force `.txt` suffix for unknown | S |
| Safe Browsing / URL scanning | None | M | On publish, `waitUntil` submit URL to Cloudflare URL Scanner API; quarantine on malicious verdict | M |

## 3. Abuse, spam, quotas

| Vector | Current state | Risk | Recommendation | Effort |
|---|---|---|---|---|
| Anonymous uploads | Allowed in every auth mode; owner `anonymous`, always link-shared, listed publicly (`api.ts:486`, `durable-objects/registry.ts:554-560`) | **H** | Gate anonymous uploads behind a flag (default off in `clerk`), or require Turnstile + short TTL (e.g. 7 days) | S |
| Rate limiting | In-memory `Map` per isolate (`utils/rate-limit.ts:11`), 30/min (`api.ts:169`); not shared across isolates/colos; falls back to spoofable `X-Forwarded-For` (`rate-limit.ts:26-28`); no limit on `/d/:id`, `/llms.txt`, websocket | **H** | Use Workers Rate Limiting binding keyed by user id or IP; drop `X-Forwarded-For`; add per-route limits | S |
| Upload size / storage quota | No size check in `handlePublish` (`api.ts:474-590`); Workers 100 MB body cap is the only bound. No per-user doc count or bytes quota | **H** | `MAX_UPLOAD_BYTES` (e.g. 5 MB) check before `formData()` via `Content-Length` and after parse; per-user quota in Registry | S |
| SEO spam via public listing | Shell sets `<meta name="robots" content="all">` (`frontend/shell.tsx:41`); homepage and `/llms.txt` list newest 50 link-shared docs; no `X-Robots-Tag` | **H** | `X-Robots-Tag: noindex, nofollow` on `/d/*` and raw pages; only list docs from verified accounts; `rel="nofollow ugc"` on listing links; `robots.txt` disallow `/d/` | S |
| Comment / websocket spam | 64 KB message cap, 10k-char comment, 100-char name (`document.ts:243-245`); no per-socket rate or count cap | M | Per-connection token bucket in DO, max comments per doc per author, max sockets per doc | S |
| Doc ID enumeration | IDs are `slug-from-filename` + 5-char nanoid (`api.ts:514`) or fully custom slug; `/api/documents/by-filename` exists (`api.ts:598`) | M | Use longer random suffix (>=10 chars) for link-shared docs; keep slug as cosmetic prefix only | S |

## 4. Auth, sessions, API keys

| Vector | Current state | Risk | Recommendation | Effort |
|---|---|---|---|---|
| API keys | `shk_` prefix, SHA-256 hashed at rest (`utils/auth.ts:82-110`); no expiry, scopes or last-used | M | Add `last_used_at`, optional expiry, per-key rate limit, revoke-all; register `shk_` with GitHub secret scanning | M |
| CSRF | Cookie-auth unsafe methods need Origin match + HMAC capability token (`utils/request-security.ts:...requireBrowserCapability`) | L | Good. Anonymous publish skips the check (`api.ts:481-484`) — acceptable since there is no session | - |
| `/api/clerk/sign_in` form POST | Accepts email/password/redirect form fields (`api.ts:54-70`) | M | Verify `redirect` is same-origin only and the route is rate-limited | S |
| `AUTH_MODE=none` | Every request is `dev@localhost` (`utils/auth.ts:17, 122-126`); dev wrangler config uses it (`wrangler.jsonc` vars) | M | Refuse to boot `none` when hostname is not localhost / a `ALLOW_PUBLIC_NONE` flag is unset | S |
| Delete token | Returned once, deletes without auth (`/api/documents/:id/token/:token`) | L | Compare in constant time; keep long random | S |

## 5. Framing, caching, privacy

| Vector | Current state | Risk | Recommendation | Effort |
|---|---|---|---|---|
| Clickjacking | No `frame-ancestors` / `X-Frame-Options` on shell, dashboard, or raw pages (`utils/csp.ts:16-51`, `routes/viewer.ts:56-64`) | M | `frame-ancestors 'self'` on all HTML; raw `.html` `'self'` (dashboard previews need it) | S |
| Cache poisoning / leakage | Raw and source use `public, max-age=0, must-revalidate` (`viewer.ts:63, 193`); homepage `public, max-age=60, s-maxage=300` (`index.ts:275`) | M | `private, no-store` for any response that varies on auth (shared-by-email docs must never be `public`); `Vary: Cookie` or no shared cache on homepage | S |
| Privacy of `/llms.txt` | Lists every `is_shared = 1` (link-only) doc to anyone (`index.ts:71-86`, `registry.ts:554-560`). "Anyone with the link" becomes "anyone" | **H** | Add explicit `listed`/`public` flag separate from link sharing; list only opted-in docs | S |
| Homepage analytics | Public KPIs only when unauthenticated in clerk mode (project rule) | L | Keep test coverage for that rule | - |
| Referrer leakage | Outbound links use `noreferrer`; no global `Referrer-Policy` | L | `Referrer-Policy: strict-origin-when-cross-origin` (shell), `no-referrer` (raw) | S |

## 6. Agents (llms.txt, WebMCP, prompt injection)

| Vector | Current state | Risk | Recommendation | Effort |
|---|---|---|---|---|
| Prompt injection via artifacts | Agents fetching `/d/:id.html` or `/llms.txt` read attacker-written text as if from sharehtml | **H** | Prefix `/llms.txt` with an "untrusted user content" notice; list only verified/opted-in docs; expose `X-ShareHTML-Untrusted: 1` header | S |
| Markdown injection in `/llms.txt` | Titles interpolated raw: `- [${d.title}](...)` (`index.ts:82`); a title with `](https://evil)` or newlines forges entries | M | Strip newlines/brackets from titles, cap length | S |
| WebMCP tools | No `modelContext`/WebMCP registration found on this branch (`grep` empty); PR #58 not merged here | M (when it lands) | Read-only tools only, no tool that publishes/deletes without user confirmation, never register tools inside document iframe, mark returned doc content as untrusted | M |

## 7. Operations: reporting and takedown

| Item | Current state | Risk | Recommendation | Effort |
|---|---|---|---|---|
| Report abuse | No report link, endpoint or admin queue (`grep report|abuse` empty) | **H** | "Report" button on shell -> `POST /api/reports` (Turnstile, rate-limited) -> Registry table + email/webhook | M |
| Takedown | Only owner/delete-token delete; no admin `disabled` flag | **H** | `disabled_at` column checked in `loadDocWithAccessCheck` (`utils/document-access.ts`); admin route behind Access | S |
| Turnstile | Not used | M | Turnstile on anonymous publish and report endpoint | S |
| WAF | Not configured in repo | M | WAF rate rule on `/api/documents` POST and `/api/v1/publish`; block known phishing kits by body keyword (optional) | S |
| Audit logging | Security warnings logged (`request-security.ts:logSecurityWarning`); publishes not logged with IP | M | Structured log `{event:"publish", id, owner, ip_hash, size}` | S |

## Top 10 actions (PR-sized, in order)

1. **No-crawler/no-backlink headers**: global middleware setting `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` and `Referrer-Policy: no-referrer` on every response; `robots.txt` with `Disallow: /`; replace `robots content="all"` (`frontend/shell.tsx:41`); inject `<meta name="referrer" content="no-referrer">` into srcdoc.
2. **Rewrite every `<a>`/`<area>`** in rendered content (sanitizer, markdown, data render, raw page) to `rel="nofollow ugc noopener noreferrer" target="_blank"`; same `rel` on homepage/llms listing links.
3. **Cloudflare bot config**: Bot Fight Mode, AI crawler block, WAF rule blocking bots on `/d/*` (document the settings in repo).
4. **Harden raw `/d/:id.html`**: CSP `sandbox; form-action 'none'; base-uri 'none'; frame-ancestors 'self'` (`routes/viewer.ts:56-64`). Stops phishing forms, meta-refresh redirects, framing.
5. **Stop leaking link-shared docs**: `listed` flag; `/llms.txt` and homepage list only opted-in docs; sanitize titles (`index.ts:71-86`, `registry.ts:554`).
6. **Upload size limit + per-user quota** in `handlePublish` (`routes/api.ts:474`).
7. **Real rate limiting**: Workers Rate Limiting binding keyed by user or `CF-Connecting-IP` only; cover publish, `/llms.txt`, `/d/*`, websocket (`utils/rate-limit.ts`).
8. **Lock down anonymous publishing**: off by default in `clerk`/`access`, Turnstile + TTL when on (`routes/api.ts:475-487`).
9. **Report-abuse button + admin takedown** (`disabled_at` checked in `utils/document-access.ts`).
10. **Framing/agents/slugs**: `frame-ancestors 'self'` in `utils/csp.ts`; untrusted-content header for agents; longer random slug suffix + reserved words. Longer term (M): move raw HTML to a separate user-content domain and add URL Scanner on publish.
