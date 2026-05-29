import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) { process.env[k] = envConfig[k]; }

const supabaseUrl = (process.env.VITE_SUPABASE_URL || "").trim().replace(/['"]/g, '');
const supabaseKey = (process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim().replace(/['"]/g, '');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkActions() {
  const { data, error } = await supabase
    .from('action_counts')
    .select('*');
  
  if (error) {
    console.error('ERROR:', error);
  } else {
    console.log('ACTION_COUNTS:', JSON.stringify(data, null, 2));
  }

  const { count: sentCount, error: sentError } = await supabase
    .from('broadcast_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sent');

  console.log('BROADCAST_QUEUE_SENT:', sentCount);
}

checkActions().catch(console.error);
