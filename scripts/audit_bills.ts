import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function auditBills() {
  console.log("--- BILLS OCR AUDIT ---");
  
  // Check for OCR_REQUIRED in sponsor column
  const { data: sponsorMisses, error: sponsorError } = await supabase
    .from('bills')
    .select('id, title, sponsor')
    .ilike('sponsor', '%OCR_REQUIRED%');

  if (sponsorError) {
    console.error("Error fetching sponsor misses:", sponsorError);
  } else {
    console.log(`Found ${sponsorMisses?.length || 0} bills with 'OCR_REQUIRED' in sponsor.`);
    sponsorMisses?.forEach(b => console.log(` - [${b.id}] ${b.title}`));
  }

  // Check for empty text_content (another form of missing data)
  const { data: contentMisses, error: contentError } = await supabase
    .from('bills')
    .select('id, title')
    .is('text_content', null);

  if (contentError) {
    console.error("Error fetching content misses:", contentError);
  } else {
    console.log(`Found ${contentMisses?.length || 0} bills with empty text_content.`);
  }
}

auditBills().catch(console.error);
