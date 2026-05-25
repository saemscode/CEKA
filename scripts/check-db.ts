import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

const envConfig = dotenv.config({ path: path.join(process.cwd(), '.env') }).parsed;
const supabaseUrl = envConfig!.VITE_SUPABASE_URL;
const supabaseKey = envConfig!.VITE_SUPABASE_SERVICE_ROLE_KEY || envConfig!.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  const { data, error } = await supabase.rpc('get_tables'); // Checking if custom RPC exists
  if (error) {
    // If no RPC, try information_schema
    const { data: tables, error: tableError } = await supabase
      .from('bills') // Just checking connectivity
      .select('count', { count: 'exact', head: true });
    
    console.log('Bills count:', tables);
    
    // Total count from signatures
    const { count } = await supabase
      .from('signatures')
      .select('*', { count: 'exact', head: true });
    
    console.log('TOTAL SIGNATURES:', count);
  } else {
    console.log('Tables:', data);
  }
}
listTables().catch(console.error);
