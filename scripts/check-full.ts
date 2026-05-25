// @ts-nocheck

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

const envConfig = dotenv.config({ path: path.join(process.cwd(), '.env') }).parsed;

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const res = await supabase
    .from('signatures')
    .select('*', { count: 'exact', head: true });

  console.log('RESPONSE:', JSON.stringify(res, null, 2));
}
check().catch(console.error);
