/**
 * bill_sponsor_scraper.ts
 *
 * CEKA Bill Sponsor Extraction System v4.0 (STRICT HAM MODE)
 *
 * Architecture:
 *  - Stub-Buster: Recursively follows HTML redirects or parses interstitial pages for PDF binaries.
 *  - Reverse Page-by-Page Anchor: Scans from the document tail backwards to find signature landmarks.
 *  - OCR_REQUIRED Detection: Flags image-only PDFs for manual/cloud OCR.
 *  - Generic Sponsor Retargeting: Scrubbing historical high-level names for specific personal entities.
 *  - Zero-Opinion Precision: Adheres to Kenyan legislative signature hierarchy (MP/Senator/Chair).
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

import { chromium, Page } from "playwright";
import { Client } from "pg";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";

dotenv.config();

// ─── Environment ─────────────────────────────────────────────────────────────

const DB_URL = process.env.SUPABASE_DB_POOLED_URL;
const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";

if (!DB_URL) {
  console.error("\n[FATAL] SUPABASE_DB_POOLED_URL missing in .env");
  process.exit(1);
}

// ─── Configuration ────────────────────────────────────────────────────────────

const DATA_DIR    = path.resolve(process.cwd(), "data");
const OUTPUT_CSV  = path.join(DATA_DIR, "bill_sponsors_trace.csv");
const CURSOR_FILE = path.join(DATA_DIR, "sponsor_cursor.json");
const BATCH_SIZE  = 50; 
const DELAY_MS    = 1000;

const MIN_VALID_PDF_CHARS = 300;
const OCR_THRESHOLD_BYTES = 500000; // 500KB+ with low text -> likely image PDF
const TAIL_SCAN_CHARS     = 40000;  // 40k chars for multi-page Memorandums

const MEMORANDUM_LANDMARKS = [
  "MEMORANDUM OF OBJECTS AND REASONS",
  "Memorandum of Objects and Reasons",
  "MEMORANDUM OF OBJECTS",
  "Memorandum of Objects",
];

const SIGNATURE_LANDMARKS = [
  "Dated the",
  "DATED THE",
  "Dated this",
  "Submitted by",
  "SUBMITTED BY",
  "Moved by",
  "MOVED BY",
];

const GENERIC_SPONSOR_SQL_CONDITIONS = `
  OR sponsor ILIKE 'senator'
  OR sponsor ILIKE 'the senate'
  OR sponsor ILIKE 'senate'
  OR sponsor ILIKE 'parliament'
  OR sponsor ILIKE 'national assembly'
  OR sponsor ILIKE 'the national assembly'
  OR sponsor ILIKE 'government'
  OR sponsor ILIKE 'national treasury'
  OR sponsor ILIKE 'national treasury and economic planning'
  OR sponsor ILIKE 'national treasury and planning'
  OR sponsor ILIKE 'ministry of health'
  OR sponsor ILIKE 'health committee'
  OR sponsor ILIKE 'parliamentary service commission'
  OR sponsor ILIKE 'national transport and safety authority'
  OR sponsor ILIKE 'national construction authority'
  OR sponsor ILIKE 'national government constituencies development fund'
  OR sponsor ILIKE '%no sponsor%'
  OR sponsor ILIKE '%no information%'
  OR sponsor ILIKE '%not found%'
  OR sponsor ILIKE '%unknown%'
  OR sponsor ILIKE '%not explicitly stated%'
  OR sponsor ILIKE 'no sponsor information%'
  OR sponsor ILIKE 'no sponsor identified%'
  OR sponsor ~ '^(The )?(National Assembly|Senate|Parliament|Government|Senator|Speaker|Committee)$'
`;

const REJECT_PATTERNS_DS: RegExp[] = [
  /^NOT_FOUND$/i,
  /^No sponsor/i,
  /^No information/i,
  /^National Assembly$/i,
  /^The National Assembly$/i,
  /^Senate$/i,
  /^The Senate$/i,
  /^Parliament$/i,
  /^National Treasury$/i,
  /^Government$/i,
  /^Senator$/i,
  /^Speaker$/i,
  /not found/i,
  /no sponsor/i,
  /not identified/i,
  /not explicitly stated/i,
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bill {
  id: string;
  title: string;
  pdf_url: string | null;
  sponsor: string | null;
}

// ─── ResilientPG ──────────────────────────────────────────────────────────────

class ResilientPG {
  private client: Client;
  private connected: boolean = false;

  constructor(private connectionString: string) {
    this.client = new Client({ connectionString });
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    this.client = new Client({ connectionString: this.connectionString });
    await this.client.connect();
    this.connected = true;
  }

  async query(text: string, params?: any[]): Promise<any> {
    if (!this.connected) await this.connect();
    try {
      return await this.client.query(text, params);
    } catch (err) {
      this.connected = false;
      throw err;
    }
  }

  async end(): Promise<void> {
    if (this.connected) await this.client.end();
    this.connected = false;
  }
}

// ─── DeepSeek v4.0 Bridge ─────────────────────────────────────────────────────

async function adjudicateSponsor(
  contextBlock: string,
  title: string
): Promise<{ name: string; method: "DEEPSEEK" } | null> {
  const keys = [
    process.env.DEEPSEEK_API_KEY,
    process.env.DEEPSEEK_API_KEY_SECONDARY,
  ].filter((k): k is string => !!k).map(k => k.trim().replace(/['"]/g, ''));

  if (keys.length === 0) {
    console.error("  [LLM-FATAL] No DeepSeek API keys configured!");
    return null;
  }

  const systemPrompt = `You are a Kenyan Legislative Data Adjudicator.
Your goal is to extract the EXACT NAME AND TITLE of the sponsor of the bill from the provided document segment.

KENYAN SPONSOR RULES:
1. The Sponsor is the individual (MP, Senator) or Committee Chair who moved the bill.
2. They are found in the final signature block of the "Memorandum of Objects and Reasons".
3. Landmarks: "Dated the...", "Dated this...", followed by a name like "Hon. Kimani Ichung'wah, M.P."
4. If multiple names appear, the one directly under "Dated the..." is the primary mover.
5. If only a Committee name appears (e.g., "Budget and Appropriations Committee"), return that.
6. IGNORE administrative submitters (Cabinet Secretaries) and Clerks unless they are explicitly marked as movers.
7. Standalone institutional names (National Assembly, Senate) are NOT accepted. Return NOT_FOUND if only they are present.
8. Names often start with Hon., Sen., or titles like Dr., Prof.

OUTPUT: Just the name and title. No conversation. If not found, return NOT_FOUND.`;

  const userPrompt = `Bill Title: "${title}"
Context Block (Tail of PDF):
---
${contextBlock}
---
Identify the Sponsor:`;

  for (const key of keys) {
    try {
      const response = await axios.post(
        `${DEEPSEEK_BASE_URL}/chat/completions`,
        {
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0,
        },
        {
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          timeout: 45000,
        }
      );

      const raw = response.data.choices[0].message.content.trim();
      if (REJECT_PATTERNS_DS.some(p => p.test(raw))) {
        console.log(`  [LLM-REJECT] DeepSeek returned: "${raw}"`);
        continue;
      }
      return { name: raw, method: "DEEPSEEK" };
    } catch (err: any) {
      console.warn(`  [LLM-WARN] Key failed (${key.slice(0, 5)}...): ${err.message}`);
      if (err.response?.status === 402) continue; // Out of balance, try next
      if (err.response?.status === 429) {
          console.log("  [LLM-429] Rate limited. Waiting 2s...");
          await new Promise(r => setTimeout(r, 2000));
          continue;
      }
    }
  }
  return null;
}

// ─── Stub-Buster: PDF Download v4.0 ──────────────────────────────────────────

async function downloadPDFStrict(url: string, page: Page): Promise<Buffer | null> {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 30000,
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      },
      maxRedirects: 10
    });

    const contentType = response.headers["content-type"] || "";
    const buf = Buffer.from(response.data);

    // If it's HTML, it's a stub or a redirector
    if (contentType.includes("text/html") || buf.slice(0, 5).toString() !== "%PDF-") {
      const htmlContent = buf.toString("utf-8");
      
      // Look for meta-refresh, .pdf links, or JS location redirects
      const patterns = [
        /href="([^"]+\.pdf)"/i,
        /url=([^"]+\.pdf)/i,
        /window\.location\s*=\s*"([^"]+)"/i,
        /location\.href\s*=\s*"([^"]+)"/i,
      ];

      for (const pattern of patterns) {
        const match = htmlContent.match(pattern);
        if (match) {
          let target = match[1];
          const absoluteUrl = target.startsWith("http") ? target : new URL(target, url).href;
          console.log(`  [STUB-BUSTER] Found potential link: ${absoluteUrl}`);
          return downloadPDFStrict(absoluteUrl, page);
        }
      }

      console.warn(`  [STUB] HTML found but no PDF links detected. Content: "${htmlContent.slice(0, 100)}..." Using Playwright fallback.`);
      return downloadPDFPlaywright(url, page);
    }

    return buf;
  } catch (err: any) {
    console.warn(`  [HTTP-FAIL] ${err.message}. Using Playwright fallback.`);
    return downloadPDFPlaywright(url, page);
  }
}

async function downloadPDFPlaywright(url: string, page: Page): Promise<Buffer | null> {
  try {
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 30000 }),
      page.goto(url, { waitUntil: "commit", timeout: 30000 }).catch(e => {
        if (!e.message.includes("Download is starting")) throw e;
      }),
    ]);

    if (download) {
      const stream = await download.createReadStream();
      const chunks: Buffer[] = [];
      for await (const chunk of stream!) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    }
  } catch (err: any) {
    console.error(`  [FETCH-ERR] ${err.message}`);
  }
  return null;
}

// ─── Extraction Logic v4.0 ───────────────────────────────────────────────────

async function extractPDFText(buffer: Buffer): Promise<string | null> {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (err) {
    console.error(`  [PARSE-ERR] pdf-parse failed.`);
    return null;
  }
}

async function processBill(
  bill: Bill,
  page: Page,
  pg: ResilientPG
): Promise<void> {
  console.log(`\n[BILL] ${bill.title.slice(0, 80)}`);
  
  if (!bill.pdf_url) {
    console.warn("  [SKIP] No PDF URL");
    return;
  }

  const buffer = await downloadPDFStrict(bill.pdf_url, page);
  if (!buffer) {
    fs.appendFileSync(OUTPUT_CSV, `"${bill.id}","${bill.title}","","FAIL","DOWNLOAD_FAILED"\n`);
    return;
  }

  const text = await extractPDFText(buffer);
  
  // OCR Awareness
  if (!text || text.trim().length < MIN_VALID_PDF_CHARS) {
    const status = (buffer.length > OCR_THRESHOLD_BYTES) ? "OCR_REQUIRED" : "STUB";
    console.warn(`  [${status}] Size: ${buffer.length} bytes, Text chars: ${text?.length || 0}`);
    
    // PERSIST TO DB: Update the sponsor as a flag for the OCR worker
    await pg.query("UPDATE public.bills SET sponsor = $1 WHERE id = $2", [status, bill.id]);
    
    fs.appendFileSync(OUTPUT_CSV, `"${bill.id}","${bill.title}","","${status}","STUB_PDF"\n`);
    return;
  }

  // Reverse Search Anchor logic
  let contextBlock = "";
  let landmarkUsed = "TAIL";

  // Try landmarks first
  const reversedText = text.slice(-TAIL_SCAN_CHARS);
  for (const LM of SIGNATURE_LANDMARKS) {
    const idx = reversedText.lastIndexOf(LM);
    if (idx !== -1) {
      contextBlock = reversedText.slice(idx).trim();
      landmarkUsed = LM;
      break;
    }
  }

  if (!contextBlock) contextBlock = reversedText;

  console.log(`  [EXTRACT] Landmark "${landmarkUsed}" found context (${contextBlock.length} chars)`);

  const result = await adjudicateSponsor(contextBlock, bill.title);
  if (result) {
    console.log(`  [SUCCESS] Found: ${result.name} via ${result.method}`);
    await pg.query("UPDATE public.bills SET sponsor = $1 WHERE id = $2", [result.name, bill.id]);
    fs.appendFileSync(OUTPUT_CSV, `"${bill.id}","${bill.title}","${result.name}","HIGH","${result.method}"\n`);
  } else {
    console.warn("  [MISS] DeepSeek could not identify a valid sponsor.");
    fs.appendFileSync(OUTPUT_CSV, `"${bill.id}","${bill.title}","","MISS","NOT_FOUND"\n`);
  }
}

// ─── Main Runner ─────────────────────────────────────────────────────────────

async function main() {
  console.log("\n[CEKA-Scraper v4.0] Full Precision HAM Mode engaged.");
  const pg = new ResilientPG(DB_URL!);

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  let processedIds: string[] = [];
  if (fs.existsSync(CURSOR_FILE)) {
    try {
      processedIds = JSON.parse(fs.readFileSync(CURSOR_FILE, "utf-8")).processedIds || [];
    } catch { processedIds = []; }
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  // Fresh CSV header only if file doesn't exist
  if (!fs.existsSync(OUTPUT_CSV)) {
    fs.writeFileSync(OUTPUT_CSV, "id,title,sponsor,confidence,method\n");
  }

  while (true) {
    // TARGETED QUERY: ignore cursor for entries that are currently markers or stubs
    const { rows: bills } = await pg.query(
      `SELECT id, title, pdf_url, sponsor FROM public.bills 
       WHERE pdf_url IS NOT NULL 
       AND (sponsor IS NULL OR sponsor = '' ${GENERIC_SPONSOR_SQL_CONDITIONS})
       ORDER BY created_at DESC
       LIMIT $1`,
      [BATCH_SIZE]
    );

    if (bills.length === 0) {
      console.log("  [INFO] No bills matching generic/empty sponsor conditions found.");
      break;
    }

    console.log(`  [BATCH] Processing ${bills.length} target bills...`);

    for (const bill of bills) {
      await processBill(bill, page, pg);
      // We still update cursor just in case, but the query above now prioritizes misses
      processedIds.push(bill.id);
      fs.writeFileSync(CURSOR_FILE, JSON.stringify({ processedIds }));
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  await browser.close();
  await pg.end();
  console.log("\n[COMPLETE] Run finished. Check data/bill_sponsors_trace.csv for audit.");
}

main().catch(e => console.error("[FATAL]", e));
