import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

const BASE_URL = 'https://www.civiceducationkenya.com';

const DEFAULT_META = {
  title: 'Civic Education Kenya - Educate • Amplify • Empower',
  description: 'Comprehensive civic education platform for Kenyan citizens. Learn about governance, rights, responsibilities, and participate in democracy.',
  image: `${BASE_URL}/lovable-uploads/1.webp`,
};

function truncate(str: string, max: number): string {
  if (!str) return '';
  return str.length > max ? str.substring(0, max - 3) + '...' : str;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Injects dynamic SEO tags into the built index.html template.
 * This runs on Vercel serverless for every /bill/, /blog/, /resources/ request,
 * serving bots (Google, Facebook, Twitter, WhatsApp) with fully-populated <head> tags
 * before the React SPA hydrates.
 *
 * Real users still get full React: this function returns the same HTML shell
 * with richer meta tags, and React hydrates on top identically.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { type, id } = req.query as { type: string; id: string };

  let title = DEFAULT_META.title;
  let description = DEFAULT_META.description;
  let image = DEFAULT_META.image;
  let canonical = `${BASE_URL}/${type}/${id}`;
  let ogType = 'website';

  try {
    if (type === 'bill' && id) {
      const { data } = await supabase
        .from('bills')
        .select('title, summary, bill_no, category, slug')
        .or(`slug.eq.${id},id.eq.${id}`)
        .maybeSingle();

      if (data) {
        title = `${data.title} | Legislative Tracker | CEKA`;
        const rawDesc = data.summary
          ? `${data.summary} Track the full status and submit a memorandum for ${data.title}.`
          : `Track the ${data.title} through Parliament. Submit a memorandum and follow Kenya's legislative process on CEKA.`;
        description = truncate(rawDesc, 155);
        canonical = `${BASE_URL}/bill/${data.slug || id}`;
        ogType = 'article';
        image = `${BASE_URL}/icons/og-bill.png`;
      }
    } else if (type === 'blog' && id) {
      const { data } = await supabase
        .from('blog_posts')
        .select('title, excerpt, slug, featured_image')
        .eq('slug', id)
        .maybeSingle();

      if (data) {
        title = `${data.title} | Blog | CEKA`;
        description = truncate(data.excerpt || `Read ${data.title} on the CEKA blog.`, 155);
        canonical = `${BASE_URL}/blog/${data.slug || id}`;
        ogType = 'article';
        if (data.featured_image) image = data.featured_image;
      }
    } else if (type === 'resource' && id) {
      const { data } = await supabase
        .from('resources')
        .select('title, description, summary, thumbnail_url, type')
        .eq('id', id)
        .maybeSingle();

      if (data) {
        title = `${data.title} | Resources | CEKA`;
        const rawDesc = data.description || data.summary || `Access ${data.title} in the CEKA civic education resource library.`;
        description = truncate(rawDesc, 155);
        canonical = `${BASE_URL}/resources/${id}`;
        if (data.thumbnail_url) image = data.thumbnail_url;
      }
    }
  } catch (err) {
    // On any DB error, fall through to defaults — page still loads correctly
    console.error('[seo-handler] DB error:', err);
  }

  // Read the built index.html
  const indexPath = path.join(process.cwd(), 'dist', 'index.html');
  let html: string;
  try {
    html = fs.readFileSync(indexPath, 'utf8');
  } catch {
    // Fallback if dist not present (dev mode)
    res.status(302).setHeader('Location', canonical);
    return res.end();
  }

  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeCanonical = escapeHtml(canonical);
  const safeImage = escapeHtml(image);

  // Inject dynamic tags — replace existing placeholders from the template
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${safeTitle}</title>`
  );
  html = html.replace(
    /<meta name="description" content="[^"]*"\s*\/>/,
    `<meta name="description" content="${safeDesc}" />`
  );
  // Inject canonical — the static canonical was removed from index.html
  html = html.replace(
    '</head>',
    `  <link rel="canonical" href="${safeCanonical}" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:url" content="${safeCanonical}" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:image" content="${safeImage}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${safeCanonical}" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${safeImage}" />
</head>`
  );

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Cache for 10 minutes at CDN edge — fresh enough for content updates
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
  return res.status(200).send(html);
}
