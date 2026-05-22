import { supabase } from "../src/integrations/supabase/client";
import { createWorker } from 'tesseract.js';
import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";

/**
 * OCR Failover Worker v1.6 - THE HAMMER
 * Handles "Download is starting" by saving locally first, then rendering.
 */

async function processOCR() {
  console.log("🚀 Starting OCR Failover Worker v1.6 (The Hammer)...");
  
  const { data: bills, error } = await supabase
    .from('bills')
    .select('id, title, pdf_url, url')
    .ilike('sponsor', '%OCR_REQUIRED%')
    .limit(10);

  if (error || !bills) {
    console.error("❌ Failed to fetch bills:", error);
    return;
  }

  console.log(`🔍 Found ${bills.length} targets.`);

  const browser = await chromium.launch({ headless: true });
  const worker = await createWorker('eng');

  for (const bill of bills) {
    try {
      console.log(`📄 Processing: ${bill.title}`);
      const targetUrl = bill.pdf_url || bill.url;
      if (!targetUrl) continue;

      // 1. Download to local disk to bypass server "attachment" headers
      const localPath = path.resolve(`./ocr_tmp_${bill.id}.pdf`);
      console.log(`📥 Downloading to handle headers...`);
      const response = await axios.get(targetUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(localPath, Buffer.from(response.data));

      const page = await browser.newPage();
      
      // 2. Render local file (file:// scheme avoids download behaviors)
      console.log(`📖 Rendering local PDF...`);
      await page.goto(`file://${localPath}`, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(4000); // Wait for internal PDF viewer

      const screenshot = await page.screenshot({ fullPage: true });
      await page.close();
      fs.unlinkSync(localPath); // Cleanup

      if (screenshot) {
        console.log(`🔎 OCR Extraction...`);
        const { data: { text } } = await worker.recognize(screenshot);

        if (text && text.trim().length > 50) {
          console.log(`✨ Got ${text.length} chars.`);
          await supabase.from('bills').update({
            text_content: text,
            neural_summary: text.substring(0, 5000), 
            sponsor: "Extracted via CEKA OCR HAMMER", 
            analysis_status: "pending" 
          }).eq('id', bill.id);
          console.log(`✅ Success.`);
        }
      }
    } catch (err: any) {
      console.error(`❌ Failed:`, err.message);
    }
  }

  await worker.terminate();
  await browser.close();
  console.log("🏁 Batch complete.");
}

processOCR().catch(console.error);
