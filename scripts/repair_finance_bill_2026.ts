// @ts-nocheck
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');
const envConfig = dotenv.config({ path: envPath }).parsed;

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error("No service role key found in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function repairFinanceBill() {
  const billId = "5f07300d-b69c-4cf8-88d2-28ac1c6a1f6e";
  
  console.log(`Targeting Bill ID: ${billId}`);
  console.log(`URL: ${supabaseUrl}`);

  const { data, error } = await supabase
    .from('bills')
    .update({
      status: 'FIRST_READING',
      stages: {
        pre_publication: { status: 'completed', completed_at: '2026-04-08' },
        publication: { status: 'completed', completed_at: '2026-05-05' },
        first_reading: { status: 'active' },
        second_reading: { status: 'pending' },
        committee: { status: 'pending' },
        report: { status: 'pending' },
        third_reading: { status: 'pending' },
        mediation: { status: 'pending' },
        assent: { status: 'pending' }
      },
      title: "The Finance Bill, 2026",
      description: "The Finance Bill, 2026"
    })
    .eq('id', billId);

  if (error) {
    console.error("ERROR:", error);
  } else {
    console.log("SUCCESS: Bill 2026 reverted to First Reading.");
  }
}

repairFinanceBill().catch(console.error);
