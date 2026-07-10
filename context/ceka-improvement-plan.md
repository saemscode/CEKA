# civiceducationkenya.com — Full Improvement Plan
**Audit date:** 2026-07-10 · **Method:** live fetches of production (homepage, bill pages, blog, robots.txt, sitemap.xml, redirect chains, prerender vs. raw HTML) — every finding below was verified against the live site, nothing inferred.

---

## Executive summary

The platform (CEKA — React/Vite SPA on Vercel behind Cloudflare, with a Cloudflare prerender worker for bots) is in decent shape structurally: sitemap is healthy (708 URLs), titles are unique, prerendering works, structured data exists. But the audit found **4 critical, deploy-blocking problems** — including two that directly sabotage the Ahrefs re-crawl you're about to run — plus a set of high-impact SEO, performance, content, and growth improvements.

**Scorecard (found today, live):**

| Area | Status |
|---|---|
| Apex domain (`civiceducationkenya.com`) | 🔴 **Returns 403 — dead for users and crawlers** |
| robots.txt vs AhrefsBot | 🔴 **`Disallow: /` — your own audit tool is blocked** |
| Duplicate meta/OG tags on interior pages | 🔴 Still present (2× canonical, 3× og:title, 2× og:description, 2× og:url on bill pages) |
| Hidden SEO text block | 🔴 Cloaking-pattern risk + injects a duplicate H1 on every page |
| Soft 404s | 🟠 Unknown URLs return HTTP 200 |
| Raw HTML meta (non-bot visitors) | 🟠 No `<meta description>`, no canonical in initial HTML |
| JS bundle | 🟠 5.85 MB single bundle (+366 KB CSS) |
| Sitemap, titles, prerender canonical on home | 🟢 Good |

---

## 1 · CRITICAL — fix before the Ahrefs re-crawl

### 1.1 The apex domain returns 403 (site is unreachable at `civiceducationkenya.com`)

Verified live:

```
http://civiceducationkenya.com/   → 403 (no redirect)
https://civiceducationkenya.com/  → 403 (no redirect)
http://www.civiceducationkenya.com/ → 308 → https://www.civiceducationkenya.com/ ✅
```

Anyone typing the bare domain — and every crawler resolving apex links — hits a Cloudflare 403. This **defeats the entire http/https/apex/www canonical-merge goal** of your canonical-tag fix: canonicals can't consolidate signals to `www` if the apex never serves a redirect. It also silently loses real users.

**Fix (Cloudflare, ~5 min):**
1. Ensure the apex has a proxied (orange-cloud) DNS record — e.g. `A @ 192.0.2.1` (dummy) or CNAME flattening — so Cloudflare answers for it.
2. Add a **Redirect Rule**: hostname `civiceducationkenya.com` → `https://www.civiceducationkenya.com/$1` (301, preserve path + query).
3. Check no WAF/security rule is issuing the 403 for the apex hostname.
4. Verify: `curl -sI http://civiceducationkenya.com/` must return `301` with `Location: https://www.civiceducationkenya.com/`.

### 1.2 robots.txt blocks AhrefsBot — the crawl you're about to run will see (almost) nothing

Your live robots.txt contains:

```
User-agent: AhrefsBot
Disallow: /
```

You're about to press **Run Crawl** on a site whose robots.txt tells AhrefsBot to go away. Depending on project settings, Ahrefs either respects it (empty crawl) or you've overridden robots — in which case your audit results don't reflect what *other* crawlers experience. Also blocked: SemrushBot, Screaming Frog, Sitebulb, `curl`, `Wget`, `python-requests`, UptimeRobot, Pingdom — you've locked out your own monitoring and every SEO tool you might ever use.

**Fix:**
- Remove (or scope) the `AhrefsBot Disallow: /` block — at minimum while auditing.
- Reconsider blocking uptime monitors (UptimeRobot/Pingdom/StatusCake) — you *want* those working.
- Deduplicate the private-area block (the `Disallow: /auth …` group appears **twice verbatim**).
- Keep the Cloudflare AI-crawler managed block if that's an intentional policy decision; it's separate.

### 1.3 Duplicate meta/OG tags are NOT fully fixed on interior pages

The homepage prerender is clean now (1× title, 1× canonical, 1× description ✅). But the **bill-page prerender still ships duplicates** — verified on `/bill/affordable-housing-bill-2023-2023`:

| Tag | Count | Should be |
|---|---|---|
| `rel="canonical"` | **2** (one plain, one `data-rh` from react-helmet) | 1 |
| `og:title` | **3** | 1 |
| `og:description` | **2** | 1 |
| `og:url` | **2** | 1 |

Root cause: a non-helmet (hardcoded or worker-injected) tag set still coexists with the react-helmet-async set on bill/legislation templates. The two canonicals happen to agree today — but the moment they diverge, indexing behavior becomes undefined, and Ahrefs will keep flagging "multiple canonical/OG" issues.

**Fix:** in the bill/legislation page template (or the prerender worker if it injects OG tags), remove the non-`data-rh` duplicates so react-helmet-async is the *only* source of truth — same surgery you did on `index.html`, applied to the interior-page path. Verify with:
```
curl -sL -A "AhrefsBot" https://www.civiceducationkenya.com/bill/<slug> | grep -c 'rel="canonical"'   # must be 1
```

### 1.4 The hidden SEO text block — cloaking-pattern risk + a duplicate H1 on every page

`index.html` contains a `position: absolute; left: -10000px` div stuffed with keyword-rich headings and paragraphs ("Hidden SEO Content for Crawlers" — the comment literally says so). Because it lives in the SPA shell, it's served on **every route**, which is why *every* page (home, bills, blog) carries the extra `<h1>Civic Education Kenya - Empowering Citizens Through Education</h1>` — the direct cause of your "Multiple H1" issue class:

- Home: 2 H1s (hidden + real hero)
- Bill pages: 3 H1s (hidden + bill title + "Submit" section H1)

Hidden text intended for crawlers is textbook [Google spam-policy](https://developers.google.com/search/docs/essentials/spam-policies#hidden-text-and-links) territory. Your real pages have genuine content now (bill pages prerender at ~150 KB of real HTML) — the crutch isn't needed and is now purely downside.

**Fix:** delete the hidden div entirely. Move anything genuinely valuable in it into *visible* page content (the homepage feature sections already cover most of it). Also demote the "Submit a memorandum" H1 on bill pages to an `<h2>` so each page has exactly one H1.

---

## 2 · HIGH-IMPACT SEO improvements

### 2.1 Soft 404s — unknown URLs return HTTP 200
`/this-page-does-not-exist-xyz` → **200**. Classic SPA catch-all: search engines index junk URLs, Ahrefs can't distinguish live from dead pages, and removed bills never drop from the index.
**Fix:** in the prerender worker / SPA router, have the NotFound route signal a real 404 — either `<meta name="robots" content="noindex">` + `prerender-status-code: 404` header from the worker, or a Vercel-level 404 for unknown non-asset paths. Bills that leave the tracker should 301 to `/legislative-tracker` or 410.

### 2.2 Raw HTML (regular users/non-prerendered crawlers) has no description or canonical
The clean-UA response is the 11 KB SPA shell with **no `<meta name="description">`, no canonical, no `og:description`, no `og:url`** — those only exist in the bot-rendered version. Google renders JS so you mostly get away with it, but: (a) any crawler your worker doesn't classify as a bot sees meta-less pages; (b) rendering-queue delays mean first-pass indexing uses the shell.
**Fix:** add a *default* description + `og:description` + `og:url` to `index.html`'s static head (react-helmet will override them per-page — since it's now sole source of truth per fix 1.3, no duplicate risk). Do **not** re-add a static canonical (that's what caused the original duplicate-canonical bug); the per-page helmet canonical is correct.

### 2.3 Kill the keywords meta tag
The 700-character `<meta name="keywords">` does nothing for Google/Bing (ignored since ~2009) and hands your entire keyword strategy to competitors in one view-source. Delete it.

### 2.4 Structured-data cleanup
- Organization `logo` points at a **Linktree UGC URL** (`ugc.production.linktr.ee/...`) — third-party, can vanish, and Google prefers same-domain logos. Host it at `https://www.civiceducationkenya.com/logo.png`.
- The `SearchAction` targets `/search?q=…` — confirm that route actually renders results; a dead SearchAction is a rich-result eligibility risk.
- **Add per-page schema where it earns SERP features:** `Article` (+ `datePublished`, `author`) on blog posts; `Legislation` schema (schema.org has it!) on bill pages — CEKA is a near-perfect use case and almost nobody uses it; `BreadcrumbList` on bills/blog; `FAQPage` on constitution/civic-rights explainers.

### 2.5 Bill-page meta descriptions are low-quality boilerplate
Live example: *"Legislative bill tracked from Senate Bills. (Scanned PDF - detailed content unavailable) Track the full status, download the PDF, and submit a memorandu..."* — the "(Scanned PDF - detailed content unavailable)" admission is shipping into search snippets on ~527 bill pages.
**Fix (template-level, one edit):** generate descriptions from structured fields you already have: *"{Bill title} ({year}) — current stage: {stage}. Summary, full text PDF, sponsor, and how to submit a public-participation memorandum. Track it live on CEKA."* Strip PDF-extraction error strings before they reach meta fields.

### 2.6 Internationalization is declared but not implemented
robots.txt allows `/en/`, `/sw/`, `/asl/`, `/br/` — but **zero hreflang tags** exist on any page. If Swahili content is real or planned, add `hreflang="sw-KE"` / `"en-KE"` pairs (helmet-managed). A Swahili version of core civic content would be a *massive* differentiator for reach in Kenya. If those locales aren't real, remove the robots entries.

---

## 3 · Performance (directly affects rankings + Kenyan mobile users)

**The JS bundle is 5.85 MB** (single `index-*.js`) plus 366 KB CSS. On the 3G/4G connections most Kenyan mobile users have, that's 20–60 s to interactive. This is the single biggest UX + Core Web Vitals lever on the site.

1. **Route-based code splitting** (`React.lazy` + dynamic `import()` per route) — the legislative tracker, blog, NASAKA map, and constitution reader should each be separate chunks. Target: <300 KB initial JS.
2. **Audit heavyweight deps** — `npx vite-bundle-visualizer`. Usual suspects: map libraries (NASAKA/IEBC map — load only on that route), PDF viewers (bill PDFs — lazy-load), chart libs, moment/locales, icon packs imported wholesale.
3. **Third-party script diet:** the head loads GTM/gtag, Ahrefs analytics, Cloudflare beacon, Brevo, Paystack inline JS, and `gptengineer.js` on **every page**. Load Paystack only on donation routes; drop `gptengineer.js` in production (it's a Lovable dev artifact); consider consolidating on one analytics tool (you currently run three).
4. **Preload hygiene:** the head preloads/prefetches 4 images including two PNG logos — convert to WebP/AVIF, and only preload what's actually in the first viewport.
5. After splitting, measure with PageSpeed Insights (mobile) — target LCP < 2.5 s, INP < 200 ms.

---

## 4 · Content & growth strategy (the "vastly better" part)

CEKA's structural assets are rare and valuable: **527 tracked bills** and **170 resources** — Kenya-specific legislative data almost nobody else publishes in crawlable form. The growth play is making each bill page the definitive result for "\<bill name\> Kenya":

1. **Enrich bill pages into landing pages:** plain-language "What this bill means for you" summary (you have an LLM pipeline available — generate + human-review), current stage visualization, sponsor, key dates, public-participation deadline, and related bills. Right now scanned-PDF bills expose no readable content — OCR them (even rough OCR beats "detailed content unavailable").
2. **Programmatic internal linking:** bills ↔ relevant constitution articles ↔ blog explainers. The constitution reader should deep-link per-article (`/constitution/article-43`) so each article can rank and receive links.
3. **Freshness = news SEO:** bill-stage changes are news events. Auto-publish "Bill X moved to Second Reading" updates (with `lastmod` sitemap bumps) — recurring crawl demand and social-share moments.
4. **Capitalize on search-demand moments:** Finance Bill seasons, voter registration 2026, by-elections. Prepare evergreen hub pages *now* ("Voter Registration Kenya 2026 — requirements, deadlines, IEBC centers near you" backed by the NASAKA map) so they've aged by the demand spike.
5. **Backlink strategy:** your bill tracker is citable infrastructure — pitch it to Kenyan newsrooms (Nation, Standard, The Elephant), civil-society orgs (Katiba Institute, TI-Kenya), and university civics departments as an embeddable/linkable data source. One "as tracked by CEKA" convention in news coverage compounds forever.
6. **Swahili civic content** (see 2.6) — likely the least-contested, highest-need keyword space in the entire niche.

---

## 5 · Prioritized execution order

| # | Action | Effort | Impact | Blocking re-crawl? |
|---|---|---|---|---|
| 1 | Apex 403 → 301 redirect to www (Cloudflare rule) | 5 min | Critical | **Yes** |
| 2 | Unblock AhrefsBot in robots.txt (+ dedupe file) | 5 min | Critical | **Yes** |
| 3 | Remove duplicate canonical/OG set on bill/interior templates | 1–2 h | Critical | **Yes** |
| 4 | Delete hidden SEO div; demote extra H1s | 30 min | Critical | **Yes** |
| 5 | Soft-404 handling in prerender worker / router | 2–4 h | High | Recommended |
| 6 | Default description/OG in static head; delete keywords tag | 15 min | High | Recommended |
| 7 | Bill-page meta-description template rewrite | 1 h | High | No |
| 8 | Route-based code splitting + dependency audit | 1–2 days | High | No |
| 9 | Schema upgrades (Legislation, Article, Breadcrumb; self-hosted logo) | 0.5 day | Medium | No |
| 10 | Third-party script diet | 2 h | Medium | No |
| 11 | Bill-page content enrichment + OCR pipeline | ongoing | Very high | No |
| 12 | Swahili content + hreflang | ongoing | Very high | No |
| 13 | Backlink/newsroom outreach program | ongoing | High | No |

**Recommended sequence:** ship 1–4 today, re-run the Ahrefs crawl to get a *true* baseline, then work down the list.

---

## Appendix — raw verification evidence

```
# Redirects
http://civiceducationkenya.com/    → 403
https://civiceducationkenya.com/   → 403
http://www.civiceducationkenya.com/ → 308 → https://www.civiceducationkenya.com/

# Raw HTML (normal UA): canonical=0, meta description=0, og:url=0
# Prerendered home (bot UA): title=1 canonical=1 description=1 H1=2
# Prerendered /bill/affordable-housing-bill-2023-2023:
#   canonical=2, og:title=3, og:description=2, og:url=2, H1=3
# /this-page-does-not-exist-xyz → HTTP 200 (soft 404)
# robots.txt: "User-agent: AhrefsBot / Disallow: /" (verbatim, live)
# Sitemap: 708 URLs (527 /bill, 170 /resources, 11 core)
# JS bundle /assets/index-CktwpafM.js = 5,853,617 bytes; CSS = 366,495 bytes
# Hidden SEO div present in index.html shell (left:-10000px), ships on all routes
```
