-- ============================================================
-- CEKA TRANSLATION PIPELINE — PRODUCTION SCHEMA
-- Date: 2026-06-01
-- Additive only. Zero touch on existing tables.
-- ============================================================

-- 1. Languages Registry
CREATE TABLE IF NOT EXISTS public.languages (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    native_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial Kenyan languages
INSERT INTO public.languages (code, name, native_name) VALUES
    ('sw', 'Kiswahili', 'Kiswahili'),
    ('ki', 'Gikuyu', 'Gĩkũyũ'),
    ('luo', 'Dholuo', 'Dholuo'),
    ('luy', 'Luhya', 'Luluhya'),
    ('kam', 'Kamba', 'Kikamba'),
    ('kal', 'Kalenjin', 'Kalenjin'),
    ('mas', 'Maasai', 'Maa'),
    ('som', 'Somali', 'Af Soomaali')
ON CONFLICT (code) DO NOTHING;

-- 2. Translation Units (Atomic text segments from Carousels/Campaigns)
CREATE TABLE IF NOT EXISTS public.translation_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_slug TEXT NOT NULL,
    slide_index INTEGER NOT NULL DEFAULT 1,
    field_type TEXT NOT NULL CHECK (field_type IN ('headline', 'body', 'cta', 'caption', 'note')),
    source_text TEXT NOT NULL,
    context_hint TEXT,
    char_limit INTEGER,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'verified', 'archived')),
    priority INTEGER NOT NULL DEFAULT 1,
    claimed_by UUID REFERENCES auth.users(id),
    claimed_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Translation Submissions (Multi-Channel: web, telegram, ai)
CREATE TABLE IF NOT EXISTS public.translation_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES public.translation_units(id) ON DELETE CASCADE,
    lang_code TEXT NOT NULL REFERENCES public.languages(code),
    translated_text TEXT NOT NULL,
    contributor_id UUID REFERENCES auth.users(id),
    telegram_user_id TEXT,
    channel TEXT NOT NULL DEFAULT 'web' CHECK (channel IN ('web', 'telegram', 'ai')),
    confidence_score NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
    glossary_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    reviewer_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Civic Glossary (Approved term mappings per language)
CREATE TABLE IF NOT EXISTS public.civic_glossary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_en TEXT NOT NULL,
    term_target TEXT NOT NULL,
    lang_code TEXT NOT NULL REFERENCES public.languages(code),
    usage_context TEXT,
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(term_en, lang_code)
);

-- Seed core civic glossary terms (Kiswahili)
INSERT INTO public.civic_glossary (term_en, term_target, lang_code, usage_context) VALUES
    ('Constitution', 'Katiba', 'sw', 'The supreme law of Kenya'),
    ('County Assembly', 'Baraza la Kaunti', 'sw', 'County-level legislative body'),
    ('Public participation', 'Ushiriki wa umma', 'sw', 'Citizen engagement in governance'),
    ('Bill', 'Mswada', 'sw', 'Proposed legislation'),
    ('Petition', 'Ombi', 'sw', 'Formal request to authority'),
    ('County executive', 'Mtendaji wa Kaunti', 'sw', 'County executive committee'),
    ('Civic education', 'Elimu ya uraia', 'sw', 'Education on citizenship'),
    ('Voter registration', 'Usajili wa wapiga kura', 'sw', 'Electoral registration'),
    ('Electoral commission', 'Tume ya uchaguzi', 'sw', 'IEBC reference'),
    ('Memorandum', 'Memoranda', 'sw', 'Official submission document'),
    ('Devolution', 'Ugatuzi', 'sw', 'Transfer of power to counties'),
    ('Senate', 'Seneti', 'sw', 'Upper house of parliament'),
    ('National Assembly', 'Bunge la Taifa', 'sw', 'Lower house of parliament'),
    ('Assent', 'Kuidhinisha', 'sw', 'Presidential approval of law'),
    ('Finance Bill', 'Mswada wa Fedha', 'sw', 'Annual budget legislation')
ON CONFLICT (term_en, lang_code) DO NOTHING;

-- 5. Translation Tasks (Channel assignment tracking)
CREATE TABLE IF NOT EXISTS public.translation_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES public.translation_units(id) ON DELETE CASCADE,
    lang_code TEXT NOT NULL REFERENCES public.languages(code),
    assigned_to_user_id UUID REFERENCES auth.users(id),
    telegram_user_id TEXT,
    channel TEXT NOT NULL DEFAULT 'web' CHECK (channel IN ('web', 'telegram')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'submitted', 'expired')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Profile hardening — additive ALTER only
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS translation_role TEXT DEFAULT 'contributor'
        CHECK (translation_role IN ('contributor', 'reviewer', 'lead', 'admin')),
    ADD COLUMN IF NOT EXISTS contribution_points INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS telegram_id TEXT;

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_translation_units_status ON public.translation_units(status);
CREATE INDEX IF NOT EXISTS idx_translation_units_project ON public.translation_units(project_slug);
CREATE INDEX IF NOT EXISTS idx_translation_submissions_unit ON public.translation_submissions(unit_id);
CREATE INDEX IF NOT EXISTS idx_translation_submissions_lang ON public.translation_submissions(lang_code);
CREATE INDEX IF NOT EXISTS idx_translation_submissions_status ON public.translation_submissions(status);
CREATE INDEX IF NOT EXISTS idx_civic_glossary_lang ON public.civic_glossary(lang_code);
CREATE INDEX IF NOT EXISTS idx_translation_tasks_unit ON public.translation_tasks(unit_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- languages: public read
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "languages_public_read" ON public.languages;
CREATE POLICY "languages_public_read" ON public.languages
    FOR SELECT USING (true);

-- translation_units: public read
ALTER TABLE public.translation_units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "translation_units_public_read" ON public.translation_units;
CREATE POLICY "translation_units_public_read" ON public.translation_units
    FOR SELECT USING (true);
DROP POLICY IF EXISTS "translation_units_admin_write" ON public.translation_units;
CREATE POLICY "translation_units_admin_write" ON public.translation_units
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND (is_admin = true OR translation_role IN ('admin', 'lead'))
        )
    );

-- translation_submissions: authenticated insert own + reviewer read all
ALTER TABLE public.translation_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "submissions_authenticated_insert" ON public.translation_submissions;
CREATE POLICY "submissions_authenticated_insert" ON public.translation_submissions
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "submissions_own_read" ON public.translation_submissions;
CREATE POLICY "submissions_own_read" ON public.translation_submissions
    FOR SELECT USING (
        contributor_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND (is_admin = true OR translation_role IN ('admin', 'reviewer', 'lead'))
        )
    );
DROP POLICY IF EXISTS "submissions_reviewer_update" ON public.translation_submissions;
CREATE POLICY "submissions_reviewer_update" ON public.translation_submissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND (is_admin = true OR translation_role IN ('admin', 'reviewer', 'lead'))
        )
    );

-- civic_glossary: public read
ALTER TABLE public.civic_glossary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "glossary_public_read" ON public.civic_glossary;
CREATE POLICY "glossary_public_read" ON public.civic_glossary
    FOR SELECT USING (true);
DROP POLICY IF EXISTS "glossary_admin_write" ON public.civic_glossary;
CREATE POLICY "glossary_admin_write" ON public.civic_glossary
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND (is_admin = true OR translation_role IN ('admin', 'lead'))
        )
    );

-- translation_tasks: authenticated read own + admin full
ALTER TABLE public.translation_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tasks_own_read" ON public.translation_tasks;
CREATE POLICY "tasks_own_read" ON public.translation_tasks
    FOR SELECT USING (
        assigned_to_user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND (is_admin = true OR translation_role IN ('admin', 'reviewer', 'lead'))
        )
    );

-- ============================================================
-- REALTIME — enable on new tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.translation_units;
ALTER PUBLICATION supabase_realtime ADD TABLE public.translation_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.translation_tasks;

-- ============================================================
-- UPDATED_AT trigger for translation_units
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_translation_unit_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_translation_unit_updated ON public.translation_units;
CREATE TRIGGER on_translation_unit_updated
    BEFORE UPDATE ON public.translation_units
    FOR EACH ROW EXECUTE PROCEDURE public.handle_translation_unit_updated_at();

-- ============================================================
-- RPC: get_translation_progress
-- Returns count of approved submissions per language per project
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_translation_progress(p_project_slug TEXT)
RETURNS TABLE (
    lang_code TEXT,
    lang_name TEXT,
    total_units BIGINT,
    approved_count BIGINT,
    pending_count BIGINT,
    progress_pct NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.code AS lang_code,
        l.name AS lang_name,
        (SELECT COUNT(*) FROM public.translation_units tu WHERE tu.project_slug = p_project_slug AND tu.status != 'archived') AS total_units,
        COUNT(ts.id) FILTER (WHERE ts.status = 'approved') AS approved_count,
        COUNT(ts.id) FILTER (WHERE ts.status = 'pending') AS pending_count,
        CASE
            WHEN (SELECT COUNT(*) FROM public.translation_units tu WHERE tu.project_slug = p_project_slug AND tu.status != 'archived') = 0 THEN 0
            ELSE ROUND(
                COUNT(ts.id) FILTER (WHERE ts.status = 'approved')::NUMERIC
                / (SELECT COUNT(*) FROM public.translation_units tu WHERE tu.project_slug = p_project_slug AND tu.status != 'archived')::NUMERIC
                * 100, 1
            )
        END AS progress_pct
    FROM public.languages l
    LEFT JOIN public.translation_submissions ts
        ON ts.lang_code = l.code
        AND ts.unit_id IN (
            SELECT id FROM public.translation_units
            WHERE project_slug = p_project_slug AND status != 'archived'
        )
    WHERE l.is_active = true
    GROUP BY l.code, l.name
    ORDER BY approved_count DESC;
END;
$$;

-- ============================================================
-- RPC: get_next_translation_task
-- Fetches the next open unit for a given language
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_next_translation_task(
    p_lang_code TEXT,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    unit_id UUID,
    project_slug TEXT,
    slide_index INTEGER,
    field_type TEXT,
    source_text TEXT,
    context_hint TEXT,
    char_limit INTEGER,
    ai_draft TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT
        tu.id AS unit_id,
        tu.project_slug,
        tu.slide_index,
        tu.field_type,
        tu.source_text,
        tu.context_hint,
        tu.char_limit,
        -- Pull AI pre-draft if exists
        (
            SELECT ts.translated_text
            FROM public.translation_submissions ts
            WHERE ts.unit_id = tu.id
              AND ts.lang_code = p_lang_code
              AND ts.channel = 'ai'
            ORDER BY ts.created_at DESC
            LIMIT 1
        ) AS ai_draft
    FROM public.translation_units tu
    WHERE tu.status = 'open'
      AND (tu.claimed_by IS NULL OR tu.claimed_by = p_user_id)
      AND NOT EXISTS (
          -- Exclude units already submitted by this user in this language
          SELECT 1 FROM public.translation_submissions ts
          WHERE ts.unit_id = tu.id
            AND ts.lang_code = p_lang_code
            AND ts.contributor_id = p_user_id
            AND ts.status IN ('pending', 'approved')
      )
    ORDER BY tu.priority DESC, tu.created_at ASC
    LIMIT 1;
END;
$$;

-- ============================================================
-- RPC: increment_contribution_points
-- Increments points for a contributor
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_contribution_points(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.profiles
    SET contribution_points = COALESCE(contribution_points, 0) + 1
    WHERE id = p_user_id;
END;
$$;

-- ============================================================
-- AI DRAFTING TRIGGER
-- Calls a webhook (Edge Function) to generate an AI draft on unit insertion
-- ============================================================

-- Function to fire the webhook
CREATE OR REPLACE FUNCTION public.trigger_ai_translation_draft()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- We use Supabase's built-in HTTP request capability if enabled, 
    -- or simply rely on the Edge Function listening to the replication stream.
    RETURN NEW;
END;
$$;

-- Note: In a real Supabase environment, you'd often use Database Webhooks in the UI 
-- to point to the Edge Function. Here we define the logic for the "AI Seed" submission.
