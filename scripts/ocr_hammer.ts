import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import Tesseract from "tesseract.js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";

// Manually load .env from current directory to avoid cross-project contamination
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim().replace(/['"]/g, '');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim().replace(/['"]/g, '');

console.log(`[INIT] PROJECT DESYNC CHECK:`);
console.log(` - Resolved URL: ${SUPABASE_URL}`);
console.log(` - Key Checksum: ${SUPABASE_KEY.slice(0, 10)}...${SUPABASE_KEY.slice(-10)}`);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface Bill {
  id: string;
  title: string;
  pdf_url: string;
}

async function hammerOCR() {
  console.log("--- CEKA LEGISLATIVE RECOVERY: THE HAMMER v1.8 (VANGUARD MODE) ---");

  const browser = await chromium.launch();
  const page = await browser.newPage();

  let hasMore = true;
  while (hasMore) {
    // 1. Find bills needing OCR
    const { data: bills, error: fetchError } = await supabase
      .from('bills')
      .select('id, title, pdf_url')
      .eq('sponsor', 'OCR_REQUIRED')
      .limit(20); // Process in chunks of 20 for stability

    if (fetchError || !bills || bills.length === 0) {
      console.log("No more bills in backlog. Shutting down.");
      hasMore = false;
      break;
    }

    console.log(`\n--- STARTING NEW BATCH: ${bills.length} bills ---`);

    for (const bill of bills) {
      try {
        console.log(`\n[PROCESSING] ${bill.title}`);
        
        let ocrBuffer: Buffer | null = null;

        try {
          // Method A: Direct Axios Download (Bypass Playwriter viewer issues)
          console.log(`  - Downloading binary via Axios...`);
          const response = await axios.get(bill.pdf_url, { 
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          ocrBuffer = Buffer.from(response.data);
        } catch (err) {
          console.warn(`  - Axios failed, trying Playwright...`);
          await page.goto(bill.pdf_url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
          ocrBuffer = await page.screenshot({ fullPage: false }); // Fallback to screenshot if all else fails
        }

        if (!ocrBuffer) throw new Error("Could not retrieve document");

        await page.goto(`data:application/pdf;base64,${ocrBuffer.toString('base64')}`, { waitUntil: 'networkidle' }).catch(() => {});
        await page.waitForTimeout(3000);

        let fullOCRText = "";
        for (let i = 0; i < 3; i++) {
          console.log(`  - OCR Page ${i+1}...`);
          const screenshot = await page.screenshot({ fullPage: false });
          
          const { data: { text } } = await Tesseract.recognize(screenshot, 'eng');
          fullOCRText += `\n--- OCR PAGE ${i+1} ---\n${text}`;
          
          await page.mouse.wheel(0, 1000); 
          await page.waitForTimeout(1000);
        }

        // Update Supabase
        console.log(`  [SYNC] Updating bill ${bill.id}...`);
        const { error: updateError } = await supabase
          .from('bills')
          .update({ 
            text_content: fullOCRText,
            sponsor: "RECOVERED_VIA_HAMMER_V1.8"
          })
          .eq('id', bill.id);

        if (updateError) console.error(`  [ERR] Update failed:`, updateError);
        else console.log(`  [SUCCESS] Bill processed.`);

      } catch (err: any) {
        console.error(`  [FATAL] Error processing bill ${bill.id}:`, err.message);
      }
    }
  }

  await browser.close();
  console.log("\n--- RECOVERY CYCLE COMPLETE ---");
}

hammerOCR().catch(console.error);
