# Civic Education Kenya — Site Audit Fix Spec

**Project:** Civiceducationkenya (Ahrefs Site Audit id 9883979)
**Target:** https://www.civiceducationkenya.com/
**Crawl:** 2026-07-10 · Health score **41/100** · 150 pages crawled, 0 broken, 0 redirect
**Stack detected:** Lovable / gptengineer **React + Vite SPA** (client-rendered; per-page `<head>` via react-helmet). Static shell is `index.html`, served for every route via SPA fallback.
**Mode:** Fix spec (no source access) — hand to your developer. Nothing was changed.

---

## The 3 root causes (each fixes many issues at once)

Almost every issue below traces to one of three template/config defects. Fix these three and the health score should jump substantially.

### ROOT CAUSE A — Static `index.html` ships a full hardcoded `<head>`, then the SPA adds a second copy
Your `index.html` contains site-wide default `<title>`, `<meta name="description">`, `og:*` and `twitter:*` tags. On interior routes react-helmet injects a *second*, page-specific set **without removing the static one** → every interior page has **two** meta descriptions, two titles' worth of tags, etc.

**Verified in live HTML** — `index.html` `<head>` currently contains:
- `<meta name="description" content="Comprehensive civic education platform for Kenyan citizens. Learn about governance, rights, responsibilities, and participate in democracy through interactive tools and resources.">` (179 chars)
- `<meta property="og:description" content="…same 179-char text…">`
- `<meta property="og:url" content="https://www.civiceducationkenya.com/">`  ← hardcoded to homepage
- `<title>Civic Education Kenya - Educate • Amplify • Empower</title>`
- **No `<link rel="canonical">` anywhere** (0 found).

**Fixes issues:** Multiple meta description tags (53 critical / 54 warning / 55 notice), Multiple H1 tags (64/55), Meta description too long (68/55), Title too long (27/27), Meta description too short (12/12), Open Graph URL not matching canonical (47).

### ROOT CAUSE B — No canonical + http & https both serve 200
There is no canonical tag, and both `http://` and `https://` versions of every URL return 200 (not redirected). Google sees duplicate URLs with no canonical signal.

**Fixes issues:** Duplicate pages without canonical (40 critical), Canonical from HTTP to HTTPS (51 notice), HTTP page has internal links to HTTPS (1).

### ROOT CAUSE C — SPA fallback serves non-HTML URLs as `text/html`
Requests for `/logo-white.png`, `/assets/index-*.css`, `/assets/index-*.js`, `/placeholders/*.png`, `/lovable-uploads/*`, and even `/sitemap.xml` return the SPA `index.html` with `Content-Type: text/html`. Ahrefs then crawls these as "pages" that (correctly) have no title, no H1, no meta description, and no outgoing links.

**Fixes issues (all FALSE POSITIVES caused by this):** Title tag missing (5), Page has no outgoing links (20), H1 missing (21 non-idx), Missing alt text (10), Low word count (16), Sitemap in the wrong format (1), Page size exceeds 2 MB (2), plus the "orphan page" = `/sitemap.xml` (1).

---

## Fix instructions by issue

Legend: **[A]/[B]/[C]** = which root cause. Priority: 🔴 critical, 🟡 warning, ⚪ notice.

### 🔴 1. Multiple meta description tags — 53 indexable pages **[A]**
**What's wrong:** Each interior page has 2 `<meta name="description">` — the static 179-char default from `index.html` + the page-specific one from helmet.
**Fix:** In `index.html`, **remove** the static `<meta name="description">`, `<meta property="og:description">`, and `<meta name="twitter:description">` lines. Let react-helmet be the single source of these tags. (Keep a `<title>` in index.html only as a no-JS fallback; helmet will override it.)
**Verify:** View source of `/resources`, `/bill/<id>`, `/community` — exactly one `<meta name="description">` each.
**Sample affected URLs:**
- https://www.civiceducationkenya.com/resources
- https://www.civiceducationkenya.com/resources/186355d7-2693-4a16-84f5-8d34954f8640
- https://www.civiceducationkenya.com/bill/c25df28d-c816-41e0-b080-66ebac03cf73

### 🔴 2. Duplicate pages without canonical — 40 pages **[B]**
**What's wrong:** No `<link rel="canonical">` on any page; http+https both 200.
**Fix (two parts):**
1. Add a **self-referencing canonical** via react-helmet on every route: `<link rel="canonical" href="https://www.civiceducationkenya.com{{ current_path }}" />` (absolute, https, www, no query string for canonical variants like `?tab=`).
2. At the host/CDN, **301-redirect all `http://` → `https://`** and pick one host (www vs non-www) as canonical, redirecting the other.
**Verify:** `curl -I http://www.civiceducationkenya.com/resources` returns 301 → https; view-source shows one canonical matching the page URL.
**Sample:** the /resources/* and /bill/* detail pages; also `/join-community?tab=volunteer&opportunity=…` (canonical should point to `/join-community`).

### 🔴 3. Page has no outgoing links — 20 URLs **[C] FALSE POSITIVE**
**What's wrong:** All 20 are image/asset URLs served as HTML (e.g. `/logo-colored.png`, `/placeholders/6.png`, `/assets/index-quQHYGKW.js`, `/nasaka-app-hero.png`).
**Fix:** Serve assets with correct `Content-Type` and stop returning `index.html` for file-extension paths (see Root Cause C fix below). No content change needed.
**Verify:** `curl -I https://www.civiceducationkenya.com/logo-white.png` returns `Content-Type: image/png`, not `text/html`.

### 🔴 4. Title tag missing or empty — 5 URLs **[C] FALSE POSITIVE**
**What's wrong:** All 5 are `.css`/`.js`/`sitemap.xml` URLs served as HTML.
**Fix:** Same as Root Cause C. No real page is missing a title.

### 🔴 5. Page size exceeds Googlebot's 2 MB crawl limit — 2 URLs **[C]**
**What's wrong:** Non-indexable asset URLs. Confirm which 2 after the Content-Type fix; if a genuine HTML page exceeds 2 MB, split/lazy-load. Likely resolves with C.

### 🔴 6. Orphan page — 1 URL **[C]**
**What's wrong:** The single "orphan" is `https://www.civiceducationkenya.com/sitemap.xml` (served as HTML). Not a real content page.
**Fix:** Serve a real XML sitemap (see issue 18). Resolves automatically.

### 🟡 7. Meta description too long — 68 indexable pages **[A]**
**What's wrong:** Concatenation of the 179-char static default + page description pushes many over ~160 chars. After removing the static tag (issue 1), re-measure.
**Fix:** After [A] fix, ensure each page's helmet description is 110–160 chars. For the ~handful still >160 on their own, trim in the page data/CMS.
**Verify:** re-crawl; check description length ≤ 160.

### 🟡 8. Multiple meta description tags (non-indexable) — 54 **[A]** — same fix as #1.

### 🟡 9. Open Graph URL not matching canonical — 47 pages **[A]**
**What's wrong:** `og:url` is hardcoded to `https://www.civiceducationkenya.com/` (homepage) on every page, but the canonical/page URL differs.
**Fix:** Set `og:url` per-page via helmet to the page's own canonical URL. Remove the static `og:url` from `index.html`.
**Verify:** view-source of /resources shows `og:url` = `https://www.civiceducationkenya.com/resources`.

### 🟡 10. Title too long — 27 indexable pages **[A] + data**
**What's wrong:** Titles like `Next Post MEDICAL INSURANCE COVER STANDARD TENDER DOCUMENT - 2024 | Resources | CEKA` (84 chars). Two problems: (a) after [A] fix only one title remains; (b) source titles are too long and some are polluted with `"Next Post "` prefixes (data bug — see #16 note).
**Fix:** Keep titles ≤ ~60 chars. Template: `{Concise Resource Name} | CEKA`. Strip the erroneous `"Next Post "` prefix at the data source.
**Sample:** `/resources/186355d7-…` ("Next Post MEDICAL INSURANCE…"), `/resources/cccee1e9-…` (122 chars).

### 🟡 11. H1 tag missing or empty — 21 **[C] FALSE POSITIVE** (all asset URLs). Same fix as Root Cause C.

### 🟡 12. Meta description tag missing or empty — 21 **[C] FALSE POSITIVE** (all asset URLs). Same fix as Root Cause C.

### 🟡 13. HTML lang attribute missing — 21 **[C] FALSE POSITIVE**
**Note:** The real `index.html` **does** have `<html lang="en">` (verified). This fires only on the asset/non-HTML URLs. Resolves with Root Cause C.

### 🟡 14. Low word count — 16 **[C] FALSE POSITIVE**
All 16 are image URLs (`contentNrWord=2`, title like `6.png (1920×1080)`). Not real thin content. Resolves with Root Cause C. *After* the fix, re-check for any genuine thin real pages.

### 🟡 15. Meta description too short — 12 pages **[A] + data**
After [A] fix, the remaining page-specific descriptions (e.g. "Related changes" = 15 chars, "The Importance Of Civic Education…" = 52 chars) are genuinely too short. Expand to 110–160 chars in the page data.
**Sample:** `/resources/d016aec3-…` (15 chars), `/resources/7c903210-…` (52 chars).

### 🟡 16. Missing alt text — 10 **[C] FALSE POSITIVE** (asset URLs counted as pages, 1 img each). Resolves with C. Separately, ensure real `<img>` in the app have `alt`.

### 🟡 17. HTML file size too large — 2 **[C]** — non-indexable assets; confirm post-C.

### 🟡 18. Sitemap in the wrong format — 1 **[C] / config**
**What's wrong:** `https://www.civiceducationkenya.com/sitemap.xml` returns `Content-Type: text/html` with "Invalid representation" — the SPA is serving `index.html` for it.
**Fix:** Generate a real XML sitemap (valid `<urlset>` with all indexable https URLs) and serve it as `application/xml` — either a static file that bypasses the SPA fallback, or a build-time generated `public/sitemap.xml`. Reference it in `robots.txt`.
**Verify:** `curl -I …/sitemap.xml` → `Content-Type: application/xml`; opens as valid XML.

### ⚪ Notice-level (lower priority)
- **Pages to submit to IndexNow (89)** & **Indexable page not in sitemap (89)** — both resolve once a real sitemap exists (#18) and pages carry canonicals (#2). Optionally enable IndexNow.
- **Multiple H1 tags (64/55)** [A] — after removing the static `<h1>`/header duplication, ensure one `<h1>` per page. Note current pages render the site name as an H1 *and* a page H1 (e.g. "Civic Education Kenya - Empowering Citizens…" + "Our Pieces"). Make the site-name a non-H1 element (logo/`<p>`), keep the page topic as the single `<h1>`.
- **Canonical from HTTP to HTTPS (51)** [B] — resolved by the http→https 301 + self-canonical.
- **Open Graph tags missing / X card missing (20/20)** — on non-indexable asset URLs; resolves with C. Real pages already have OG/Twitter tags.
- **Title too long / Meta desc too long/short (non-idx variants)** — resolved by [A].
- **Page has only one dofollow internal link (7/5)** — improve internal linking to deeper resource pages (add related-links / breadcrumb navigation). Investigate per-page; low urgency.
- **HTTP page has internal links to HTTPS (1)** [B] — resolved by http→https redirect.

---

## Consolidated developer checklist

**In `index.html` (Root Cause A):**
- [ ] Remove static `<meta name="description">`, `<meta property="og:description">`, `<meta name="twitter:description">`, `<meta property="og:url">`.
- [ ] Keep one fallback `<title>`; let helmet override per route.

**In the React app / react-helmet (Root Causes A + B):**
- [ ] Per-route: set unique `<title>` (≤60 chars), `<meta name="description">` (110–160), `og:description`, `twitter:description`.
- [ ] Per-route: set `og:url` = the page's own https/www URL.
- [ ] Per-route: add `<link rel="canonical" href="https://www.civiceducationkenya.com{path}">` (absolute, no tracking query params).
- [ ] Ensure exactly one `<h1>` per page (site name → not an H1).

**At host / CDN / server config (Root Causes B + C):**
- [ ] 301-redirect `http://` → `https://` for all URLs.
- [ ] Pick canonical host (www or non-www) and 301 the other.
- [ ] Stop returning `index.html` for paths with a file extension (`.png .jpg .webp .css .js .ico .xml`); serve real files with correct `Content-Type`.
- [ ] Serve a valid XML `sitemap.xml` (`application/xml`) and list it in `robots.txt`.

**In page data / CMS (per-page content):**
- [ ] Strip erroneous `"Next Post "` prefix from resource titles.
- [ ] Expand too-short descriptions (#15) to 110–160 chars.

---

## After the fixes — pages to re-check in a browser (view-source)

Check these representative pages have **one** title, **one** meta description (110–160), a self-canonical, correct `og:url`, and one `<h1>`:
1. https://www.civiceducationkenya.com/ (homepage)
2. https://www.civiceducationkenya.com/resources
3. https://www.civiceducationkenya.com/resources/186355d7-2693-4a16-84f5-8d34954f8640
4. https://www.civiceducationkenya.com/bill/c25df28d-c816-41e0-b080-66ebac03cf73
5. https://www.civiceducationkenya.com/community
6. https://www.civiceducationkenya.com/join-community

And verify infra fixes:
- `curl -I http://www.civiceducationkenya.com/resources` → 301 to https
- `curl -I https://www.civiceducationkenya.com/logo-white.png` → `Content-Type: image/png`
- `curl -I https://www.civiceducationkenya.com/sitemap.xml` → `Content-Type: application/xml`

**Then trigger a fresh Ahrefs crawl** (Site Audit → Civiceducationkenya → Run crawl, or `crawl_start`) and compare the health score. Don't judge the fixes by the current crawl — the data won't change until a re-crawl completes.

---

## Appendix — copy-paste code

> Reference implementation for a Lovable/Vite + React SPA using `react-helmet-async`. Adapt paths/names to your repo. These are drop-in patterns, not a blind patch — review against your actual components.

### A. Corrected `index.html` `<head>`

Remove the site-wide `description` / `og:description` / `twitter:description` / `og:url` tags (react-helmet will own them per-route). Keep only true site-level defaults + a fallback title. Result:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="google-site-verification" content="T4OUoLH5q4y8UV3eFduuNfcDrzhzfMNW2kq-HJXe6cA" />

    <!-- Fallback title only; <SEO> overrides per route -->
    <title>Civic Education Kenya - Educate • Amplify • Empower</title>
    <meta name="author" content="CEKA" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />

    <!-- Site-level OG constants that never change per page -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Civic Education Kenya" />
    <meta property="og:locale" content="en_KE" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@civicedkenya" />
    <meta name="twitter:creator" content="@civicedkenya" />

    <!-- REMOVED (now per-route via <SEO>): -->
    <!--   <meta name="description"> -->
    <!--   <meta name="keywords">  (optional; low SEO value) -->
    <!--   <meta property="og:title"> / <meta property="og:description"> / <meta property="og:url"> -->
    <!--   <meta name="twitter:title"> / <meta name="twitter:description"> -->
    <!--   <meta property="og:image"> / <meta name="twitter:image">  (move to <SEO> so pages can override) -->

    <link rel="icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" sizes="180x180" href="/lovable-uploads/60eebae9-7ca2-4cb0-823d-bcecccb0027f.png" />
    <meta name="theme-color" content="#0E1726" />
    <meta name="msapplication-TileColor" content="#0E1726" />
    <link rel="manifest" href="/manifest.json" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### B. Reusable `<SEO>` component (react-helmet-async)

Install + wrap once:

```bash
npm install react-helmet-async
```

```tsx
// src/main.tsx
import { HelmetProvider } from "react-helmet-async";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
```

```tsx
// src/components/SEO.tsx
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const SITE = "https://www.civiceducationkenya.com";
const DEFAULT_IMAGE = `${SITE}/lovable-uploads/1.webp`;

function clampDescription(d: string) {
  const t = d.trim().replace(/\s+/g, " ");
  // Aim 110–160 chars. Trim on a word boundary if too long.
  if (t.length <= 160) return t;
  return t.slice(0, 157).replace(/\s+\S*$/, "") + "…";
}

type SEOProps = {
  title: string;              // page title WITHOUT the " | CEKA" suffix
  description: string;        // 110–160 chars ideally
  image?: string;             // absolute URL; falls back to site default
  canonicalPath?: string;     // override; defaults to current path (no query)
  noindex?: boolean;
};

export default function SEO({ title, description, image, canonicalPath, noindex }: SEOProps) {
  const { pathname } = useLocation();
  // Canonical: strip query/hash, force trailing-slash-free except root.
  const path = (canonicalPath ?? pathname).split(/[?#]/)[0];
  const url = `${SITE}${path === "/" ? "/" : path.replace(/\/$/, "")}`;
  const fullTitle = `${title} | CEKA`.slice(0, 60);
  const desc = clampDescription(description);
  const img = image ?? DEFAULT_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {noindex && <meta name="robots" content="noindex, follow" />}

      <link rel="canonical" href={url} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />

      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />
    </Helmet>
  );
}
```

Use it at the top of every page/route component:

```tsx
// e.g. src/pages/Resources.tsx
import SEO from "@/components/SEO";

export default function Resources() {
  return (
    <>
      <SEO
        title="Resources"
        description="Access Kenya's largest civic education resource library: PDFs, videos, legal documents and guides on governance, the Constitution, voter rights and democratic participation."
      />
      {/* …page content… */}
    </>
  );
}
```

For dynamic detail pages (resource/bill), feed the record's own fields — and strip the erroneous `"Next Post "` prefix at the source:

```tsx
const cleanTitle = record.title.replace(/^Next Post\s+/i, "");
<SEO title={cleanTitle} description={record.summary} image={record.ogImage} />
```

**One `<h1>` per page:** render the site name in the header as a `<Link>`/`<span>`, NOT an `<h1>`. Reserve the single `<h1>` for the page topic (e.g. "Resources", the resource/bill name).

### C. Server / host config

**Netlify** (`netlify.toml` + `_redirects`) — Lovable commonly deploys here:

```toml
# netlify.toml
[[redirects]]
  from = "http://www.civiceducationkenya.com/*"
  to = "https://www.civiceducationkenya.com/:splat"
  status = 301
  force = true

# If you also want to pick www as canonical host, redirect the apex:
[[redirects]]
  from = "https://civiceducationkenya.com/*"
  to = "https://www.civiceducationkenya.com/:splat"
  status = 301
  force = true
```

SPA fallback must NOT swallow real files. In `_redirects`, the catch-all to `index.html` should be LAST, and Netlify serves existing static files first automatically — so ensure `sitemap.xml`, images, `/assets/*` physically exist in `dist/`. If you use a manual catch-all, exclude file extensions:

```
# _redirects  (only the SPA fallback line; static files are served before this)
/*    /index.html   200
```

**Vercel** (`vercel.json`):

```json
{
  "redirects": [
    { "source": "/(.*)", "has": [{ "type": "host", "value": "civiceducationkenya.com" }], "destination": "https://www.civiceducationkenya.com/$1", "permanent": true }
  ],
  "rewrites": [
    { "source": "/((?!.*\\.[a-zA-Z0-9]+$).*)", "destination": "/index.html" }
  ]
}
```

The negative-lookahead rewrite `(?!.*\.[a-zA-Z0-9]+$)` sends only extension-less routes to the SPA, so `.png/.css/.js/.xml` are served as real files with correct `Content-Type` (fixes Root Cause C). (http→https is automatic on Vercel/Netlify managed certs; the redirect above only handles apex↔www.)

### D. Sitemap generation (build-time)

Generate `public/sitemap.xml` at build so it ships as a real static file:

```js
// scripts/generate-sitemap.mjs   (run in build: "vite build && node scripts/generate-sitemap.mjs")
import { writeFileSync } from "node:fs";

const SITE = "https://www.civiceducationkenya.com";
// Replace with your real route list / fetch from your data source:
const staticRoutes = ["/", "/resources", "/pieces", "/community", "/join-community", "/terms"];
// const resourceRoutes = (await fetchResources()).map(r => `/resources/${r.id}`);
const routes = [...staticRoutes /*, ...resourceRoutes */];

const body = routes
  .map((p) => `  <url><loc>${SITE}${p}</loc></url>`)
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

writeFileSync("public/sitemap.xml", xml);
console.log(`Wrote ${routes.length} URLs to public/sitemap.xml`);
```

`robots.txt` (in `public/`):

```
User-agent: *
Allow: /
Sitemap: https://www.civiceducationkenya.com/sitemap.xml
```

Include **only** indexable https URLs (no query-param variants, no noindex pages). This resolves "Sitemap in the wrong format", "Indexable page not in sitemap", and feeds IndexNow.
