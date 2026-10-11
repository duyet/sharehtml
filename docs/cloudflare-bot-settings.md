# Cloudflare bot settings

> **Manual owner action.** These settings live in the Cloudflare dashboard, not in this repo. The code already sends `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`, `Referrer-Policy: no-referrer`, and serves `robots.txt` with `Disallow: /`. Those are advisory; the steps below enforce the "no crawler, no bot" policy at the edge.

Open the zone that serves sharehtml in the Cloudflare dashboard.

## 1. Bot Fight Mode

1. Go to **Security > Bots**.
2. Turn on **Bot Fight Mode** (or **Super Bot Fight Mode** on Pro and above).
3. On Super Bot Fight Mode, set **Definitely automated** to **Block** and **Verified bots** to **Block**.

## 2. Block AI crawlers

1. Go to **Security > Bots**.
2. Turn on **Block AI Scrapers and Crawlers** (shown as "Block AI bots").
3. Under **AI Crawl Control** (if shown), set every crawler to **Block**.

## 3. WAF custom rules

Go to **Security > WAF > Custom rules** and create:

| Name | Expression | Action |
|---|---|---|
| Block verified bots | `(cf.client.bot)` | Block |
| Block bots on documents | `(starts_with(http.request.uri.path, "/d/")) and (cf.bot_management.score lt 30)` (needs Bot Management; otherwise skip) | Block |
| Challenge homepage | `(http.request.uri.path eq "/")` | Managed Challenge |

Keep `/api/*` and `/webhooks/*` out of challenge rules: the CLI and Clerk webhooks cannot solve challenges.

## 4. Verify

```bash
curl -sI https://<host>/ | grep -i -E 'x-robots-tag|referrer-policy'
curl -s https://<host>/robots.txt
curl -sI -A "Googlebot" https://<host>/d/<id>   # expect 403 once the WAF rule is live
```
