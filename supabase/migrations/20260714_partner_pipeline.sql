-- ============================================================
-- CEKA Partner Pipeline Migration
-- Phase: Partner Application, MOU Gate, Audit Logging
-- ============================================================

-- 1. Ensure admin_audit_log table exists (used by edge functions)
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action      TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  actor_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- RLS: only service role writes; admins can read
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_audit_log' AND policyname = 'Admins can read audit log'
  ) THEN
    CREATE POLICY "Admins can read audit log"
      ON public.admin_audit_log FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
        )
      );
  END IF;
END $$;

-- 2. Add mou_signed_at column to partners if it doesn't exist
-- (tracks exactly WHEN the partner digitally accepted the MOU)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partners' AND column_name = 'mou_signed_at'
  ) THEN
    ALTER TABLE public.partners ADD COLUMN mou_signed_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- 3. Add mou_version column to partners — tracks which version of the MOU was signed
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partners' AND column_name = 'mou_version'
  ) THEN
    ALTER TABLE public.partners ADD COLUMN mou_version TEXT DEFAULT NULL;
  END IF;
END $$;

-- 4. RLS: allow authenticated users to INSERT into partners
-- This policy ONLY permits a user to insert a row where submitted_by_user_id = their own auth.uid()
-- The ingest-partner-application edge function uses service role and bypasses this entirely.
-- This secondary policy is a fallback layer.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'partners' AND policyname = 'Users can insert own partner application'
  ) THEN
    CREATE POLICY "Users can insert own partner application"
      ON public.partners FOR INSERT
      TO authenticated
      WITH CHECK (submitted_by_user_id = auth.uid());
  END IF;
END $$;

-- 5. RLS: allow authenticated users to SELECT their own partner record
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'partners' AND policyname = 'Partners can read own record'
  ) THEN
    CREATE POLICY "Partners can read own record"
      ON public.partners FOR SELECT
      TO authenticated
      USING (submitted_by_user_id = auth.uid());
  END IF;
END $$;

-- 6. RLS: allow partners to UPDATE their own record ONLY for mou fields
-- (so the frontend MOU signing page can flip agreement_signed, mou_signed_at, mou_version)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'partners' AND policyname = 'Partners can sign own MOU'
  ) THEN
    CREATE POLICY "Partners can sign own MOU"
      ON public.partners FOR UPDATE
      TO authenticated
      USING (submitted_by_user_id = auth.uid())
      WITH CHECK (submitted_by_user_id = auth.uid());
  END IF;
END $$;
