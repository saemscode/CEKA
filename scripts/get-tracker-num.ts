import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

const envConfig = dotenv.config({ path: path.join(process.cwd(), '.env') }).parsed;
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('action_counts')
    .select('count')
    .eq('action_type', 'signature_verified')
    .single();
  
  if (error) {
    console.log('ERROR:', error.message);
  } else {
    console.log('TRACKER_NUMBER:', data.count);
  }
}
check().catch(console.error);
