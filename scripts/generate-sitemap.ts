import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables explicitly
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

fs.writeFileSync(logPath, '--- SITEMAP DEV LOG ---\n');
log('URL: ' + supabaseUrl);

const BASE_URL = 'https://www.civiceducationkenya.com';

async function generateSitemap() {
  log('🚀 Starting Sitemap Generation...');

  const staticPages = [
    { url: '/', priority: 1.0, changefreq: 'weekly' },
    { url: '/legislative-tracker', priority: 0.9, changefreq: 'daily' },
    { url: '/blog', priority: 0.8, changefreq: 'weekly' },
    { url: '/resource-hub', priority: 0.8, changefreq: 'weekly' },
    { url: '/resources', priority: 0.7, changefreq: 'weekly' },
    { url: '/join-community', priority: 0.7, changefreq: 'monthly' },
    { url: '/advocacy-toolkit', priority: 0.7, changefreq: 'monthly' },
    { url: '/peoples-audit', priority: 0.7, changefreq: 'monthly' },
    { url: '/nasaka-iebc', priority: 0.7, changefreq: 'monthly' },
    { url: '/constitution', priority: 0.5, changefreq: 'yearly' },
    { url: '/legal', priority: 0.5, changefreq: 'yearly' },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

  // 1. Add Static Pages
  staticPages.forEach(page => {
    xml += `  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>\n`;
  });

  // 2. Fetch Dynamic Bills
  log('📦 Fetching Bills from Supabase...');
  const { data: bills, error: billError } = await supabase
    .from('bills')
    .select('id, slug, updated_at');

  if (billError) {
    log('Error fetching bills: ' + JSON.stringify(billError));
  } else if (bills) {
    log(`✅ Found ${bills.length} bills.`);
    bills.forEach(bill => {
      const identifier = bill.slug || bill.id;
      xml += `  <url>
    <loc>${BASE_URL}/bill/${identifier}</loc>
    <lastmod>${new Date(bill.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>\n`;
    });
  }

  // 3. Fetch Dynamic Resources
  log('📦 Fetching Resources from Supabase...');
  const { data: resources, error: resError } = await supabase
    .from('resources')
    .select('id, updated_at');

  if (resError) {
    log('Error fetching resources: ' + JSON.stringify(resError));
  } else if (resources) {
    log(`✅ Found ${resources.length} resources.`);
    resources.forEach(res => {
      xml += `  <url>
    <loc>${BASE_URL}/resources/${res.id}</loc>
    <lastmod>${new Date(res.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>\n`;
    });
  }

  xml += '</urlset>';

  const outputPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  fs.writeFileSync(outputPath, xml);
  log(`✨ Sitemap successfully generated at ${outputPath}`);
}

generateSitemap().catch(console.error);
