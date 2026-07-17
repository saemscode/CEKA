-- Ensure actor_id column exists since the previous migration was skipped because the table already existed
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_audit_log' AND column_name = 'actor_id'
  ) THEN
    ALTER TABLE public.admin_audit_log ADD COLUMN actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;
