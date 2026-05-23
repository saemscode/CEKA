
-- CEKA Database Final Alignment
-- 1. Correct AI Concerns for County Allocation Bill
UPDATE bills 
SET 
  ai_concerns = '["Transparency in mineral royalty sharing", "Timely disbursement of health project funds", "Oversight of industrial park conditional grants"]'::jsonb,
  status_lock = true
WHERE id = '35d237a9-fc9d-4a20-8e17-c5c0ff79848b';

-- 2. Fix Signature Counter Visibility (RLS Policy)
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public to view signatures" ON signatures;
CREATE POLICY "Allow public to view signatures" ON signatures FOR SELECT USING (true);
