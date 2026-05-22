import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) { process.env[k] = envConfig[k]; }

const supabase = createClient(
  (process.env.SUPABASE_URL || "").trim().replace(/['"]/g, ''),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim().replace(/['"]/g, '')
);

async function finalAudit() {
  console.log("--- FINAL PRODUCTION AUDIT ---");
  
  const { count: recoveredCount } = await supabase
    .from('bills')
    .select('*', { count: 'exact', head: true })
    .eq('sponsor', 'RECOVERED_VIA_HAMMER_V1.8');

  const { count: pendingCount } = await supabase
    .from('bills')
    .select('*', { count: 'exact', head: true })
    .eq('sponsor', 'OCR_REQUIRED');

  console.log(`- Bills successfully recovered: ${recoveredCount || 0}`);
  console.log(`- Bills still pending: ${pendingCount || 0}`);
}

finalAudit().catch(console.error);
