import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

const envConfig = dotenv.config({ path: path.join(process.cwd(), '.env') }).parsed;

if (!envConfig) {
  console.error('Could not find .env file or it is empty');
  process.exit(1);
}

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const logPath = path.join(process.cwd(), 'sitemap-debug.log');
const log = (msg: string) => {
  console.log(msg);
  fs.appendFileSync(logPath, msg + '\n');
};

fs.writeFileSync(logPath, `--- SITEMAP DEV LOG ${new Date().toISOString()} ---\n`);
log('URL: ' + supabaseUrl);

const BASE_URL = 'https://www.civiceducationkenya.com';
const TODAY = new Date().toISOString().split('T')[0];

function urlEntry(loc: string, lastmod: string, changefreq: string, priority: number): string {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>\n`;
}

async function generateSitemap() {
  log('🚀 Starting Sitemap Generation...');

  const staticPages = [
    { url: '/',                  priority: 1.0, changefreq: 'weekly' },
    { url: '/legislative-tracker', priority: 0.9, changefreq: 'daily' },
    { url: '/blog',              priority: 0.8, changefreq: 'weekly' },
    { url: '/resource-hub',     priority: 0.8, changefreq: 'weekly' },
    { url: '/resources',        priority: 0.7, changefreq: 'weekly' },
    { url: '/join-community',   priority: 0.7, changefreq: 'monthly' },
    { url: '/advocacy-toolkit', priority: 0.7, changefreq: 'monthly' },
    { url: '/peoples-audit',    priority: 0.7, changefreq: 'monthly' },
    { url: '/nasaka-iebc',      priority: 0.7, changefreq: 'monthly' },
    { url: '/constitution',     priority: 0.5, changefreq: 'yearly' },
    { url: '/legal',            priority: 0.5, changefreq: 'yearly' },
    { url: '/privacy',          priority: 0.3, changefreq: 'yearly' },
    { url: '/terms',            priority: 0.3, changefreq: 'yearly' },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated: ${new Date().toISOString()} -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

  // 1. Static pages
  staticPages.forEach(page => {
    xml += urlEntry(`${BASE_URL}${page.url}`, TODAY, page.changefreq, page.priority);
  });

  // 2. Bills — use slug (keyword-rich URL)
  log('📦 Fetching Bills...');
  const { data: bills, error: billError } = await supabase
    .from('bills')
    .select('id, slug, updated_at, status')
    .eq('status', 'PUBLISHED');

  if (billError) {
    log('Error fetching bills: ' + JSON.stringify(billError));
  } else if (bills) {
    log(`✅ Found ${bills.length} published bills.`);
    bills.forEach(bill => {
      const identifier = bill.slug || bill.id;
      const lastmod = bill.updated_at
        ? new Date(bill.updated_at).toISOString().split('T')[0]
        : TODAY;
      xml += urlEntry(`${BASE_URL}/bill/${identifier}`, lastmod, 'daily', 0.8);
    });
  }

  // 3. Blog posts — use slug (essential for SEO)
  log('📦 Fetching Blog Posts...');
  const { data: posts, error: postError } = await supabase
    .from('blog_posts')
    .select('id, slug, updated_at, published_at')
    .eq('status', 'published');

  if (postError) {
    log('Error fetching blog posts: ' + JSON.stringify(postError));
  } else if (posts) {
    log(`✅ Found ${posts.length} published blog posts.`);
    posts.forEach(post => {
      if (!post.slug) return; // Skip posts without slugs — no SEO value
      const lastmod = post.updated_at
        ? new Date(post.updated_at).toISOString().split('T')[0]
        : TODAY;
      xml += urlEntry(`${BASE_URL}/blog/${post.slug}`, lastmod, 'weekly', 0.7);
    });
  }

  // 4. Resources — use slug if available, otherwise skip (UUID URLs have no SEO value)
  log('📦 Fetching Resources...');
  const { data: resources, error: resError } = await supabase
    .from('resources')
    .select('id, slug, updated_at, is_public');

  if (resError) {
    log('Error fetching resources: ' + JSON.stringify(resError));
  } else if (resources) {
    const publicResources = resources.filter(r => r.is_public !== false);
    log(`✅ Found ${publicResources.length} public resources.`);
    let slugged = 0, skipped = 0;
    publicResources.forEach(res => {
      if (res.slug) {
        const lastmod = res.updated_at
          ? new Date(res.updated_at).toISOString().split('T')[0]
          : TODAY;
        xml += urlEntry(`${BASE_URL}/resources/${res.slug}`, lastmod, 'monthly', 0.6);
        slugged++;
      } else {
        // UUID-only resources are included but with lower priority
        // Add slug to resources table to improve these URLs
        const lastmod = res.updated_at
          ? new Date(res.updated_at).toISOString().split('T')[0]
          : TODAY;
        xml += urlEntry(`${BASE_URL}/resources/${res.id}`, lastmod, 'monthly', 0.4);
        skipped++;
      }
    });
    log(`  → ${slugged} with slugs, ${skipped} UUID-only (add slugs to resources table to fix)`);
  }

  xml += '</urlset>';

  const outputPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  fs.writeFileSync(outputPath, xml);
  log(`✨ Sitemap written to ${outputPath}`);

  // Count entries
  const urlCount = (xml.match(/<url>/g) || []).length;
  log(`📊 Total URLs: ${urlCount}`);
}

generateSitemap().catch(console.error);

