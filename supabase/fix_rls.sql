-- Fix RLS for the public transaction tracker
-- Grant SELECT access to anon users for successful transactions

DO $$ 
BEGIN
    -- Drop existing if we need to recreate, but here we just check
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'transactions' AND policyname = 'Public Select Success'
    ) THEN
        CREATE POLICY "Public Select Success" ON public.transactions
        FOR SELECT TO anon
        USING (status = 'success');
    END IF;
END $$;
