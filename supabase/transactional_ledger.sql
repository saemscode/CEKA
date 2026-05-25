-- TRANSACTIONAL LEDGER SCHEMA (PHASE 3 - FINANCIAL ISOLATION)
-- To be executed on the new Supabase project: ftswzvqwxdwgkvfbwfpx

-- 1. Create a secure schema for transactions
CREATE SCHEMA IF NOT EXISTS ledger;

-- 2. Transactions table (Append-Only)
CREATE TABLE IF NOT EXISTS ledger.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paystack_id TEXT UNIQUE,
    reference TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL, -- 'success', 'failed', 'reversed'
    amount BIGINT NOT NULL, -- in KES cents (e.g., 10000 for KES 100.00)
    currency TEXT DEFAULT 'KES',
    email TEXT,
    customer_code TEXT,
    channel TEXT, -- 'card', 'mpesa', 'bank_transfer', etc.
    ip_address TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    fees BIGINT, -- Paystack fees
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Payment Subscriptions (for Jamii/Mwananchi/Taifa plans)
CREATE TABLE IF NOT EXISTS ledger.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Links to profile ID if available
    external_customer_id TEXT,
    plan_code TEXT,
    subscription_code TEXT UNIQUE,
    email TEXT,
    status TEXT, -- 'active', 'cancelled', 'past_due'
    next_payment_date TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Audit Log (Shadow copy for manual reconciliation)
CREATE TABLE IF NOT EXISTS ledger.audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'payment.success', 'subscription.create', etc.
    raw_payload JSONB NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. RLS Policies
ALTER TABLE ledger.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger.audit_trail ENABLE ROW LEVEL SECURITY;

-- Only service_role should have full access to financial records
CREATE POLICY "Service Role full access" ON ledger.transactions FOR ALL TO service_role USING (true);
CREATE POLICY "Service Role full access" ON ledger.subscriptions FOR ALL TO service_role USING (true);
CREATE POLICY "Service Role full access" ON ledger.audit_trail FOR ALL TO service_role USING (true);

-- 6. Indexes for reporting
CREATE INDEX idx_transactions_email ON ledger.transactions(email);
CREATE INDEX idx_transactions_reference ON ledger.transactions(reference);
CREATE INDEX idx_transactions_created_at ON ledger.transactions(created_at);

-- 7. View for easy dashboarding
CREATE OR REPLACE VIEW ledger.financial_summary AS
SELECT 
    COUNT(*) as total_transactions,
    SUM(amount) FILTER (WHERE status = 'success') as total_revenue_cents,
    COUNT(*) FILTER (WHERE status = 'success') as successful_count,
    MAX(created_at) as last_transaction_at
FROM ledger.transactions;
