-- [HARDENING] Add translation_role to profiles
DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS translation_role TEXT DEFAULT 'contributor' CHECK (translation_role IN ('contributor', 'reviewer', 'admin'));
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
