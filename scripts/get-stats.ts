import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables explicitly
const envConfig = dotenv.config({ path: path.join(process.cwd(), '.env') }).parsed;

if (!envConfig) {
  console.error('Could not find .env file');
  process.exit(1);
}

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getStats() {
  const { count: total, error: totalError } = await supabase
    .from('signatures')
    .select('*', { count: 'exact', head: true });

  const { count: verified, error: verifiedError } = await supabase
    .from('signatures')
    .select('*', { count: 'exact', head: true })
    .eq('is_verified', true);

  const { data: financeBill } = await supabase
    .from('bills')
    .select('id')
    .ilike('title', '%Finance Bill 2026%')
    .single();

  let financeCount = 0;
  if (financeBill) {
    const { count } = await supabase
      .from('signatures')
      .select('*', { count: 'exact', head: true })
      .eq('bill_id', financeBill.id);
    financeCount = count || 0;
  }

  console.log('--- CEKA LIVE STATS ---');
  console.log('Total Signatures (All):', total);
  console.log('Verified Signatures:', verified);
  console.log('Finance Bill 2026 Signatures:', financeCount);
}

getStats().catch(console.error);
