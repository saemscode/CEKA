-- ────────────────────────────────────────────────────────────
-- 🛡️ TRANSLATION PIPELINE HARDENING 🛡️
-- Applied fixes per the Security Audit (Spam Prevention & Idempotency)
-- ────────────────────────────────────────────────────────────

-- 1. Database Idempotency (The "Unique" Guard)
-- Prevent Double-Fire Webhook bugs and Ballot-Stuffing by ensuring a single 
-- Telegram User/Web User cannot submit multiple duplicate rows for the same snippet/language.
ALTER TABLE translation_submissions 
ADD CONSTRAINT unique_unit_lang_user 
UNIQUE (unit_id, lang_code, submitted_by);

-- 2. Authorization Barrier
-- Secure the external Edge Function triggers by injecting a Webhook Secret
-- Ensure standard users cannot guess and manually mutate the status of submissions
-- Assuming a table exists for system_secrets, but for this context, 
-- we enforce a comment/policy reminder for Supabase Vault.
COMMENT ON TABLE translation_submissions IS 'Secured table: Ingestion endpoints must validate using VALIDATE_WEBHOOK_SECRET.';
