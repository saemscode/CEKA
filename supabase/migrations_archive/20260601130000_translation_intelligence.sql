-- [INTELLIGENCE LAYER] CEKA Translation Pipeline Automation
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- 1. Progress Tracking View
CREATE OR REPLACE VIEW public.translation_progress AS
SELECT 
    tu.project_slug as carousel_id,
    l.code as lang_code,
    l.name as language_name,
    COUNT(tu.id) as total_units,
    COUNT(ts.id) FILTER (WHERE ts.status = 'approved') as approved_units,
    ROUND((COUNT(ts.id) FILTER (WHERE ts.status = 'approved')::numeric / NULLIF(COUNT(tu.id), 0)) * 100, 2) as progress_percentage
FROM 
    public.translation_units tu
CROSS JOIN 
    public.languages l
LEFT JOIN 
    public.translation_submissions ts ON tu.id = ts.unit_id AND l.code = ts.lang_code
WHERE 
    tu.status != 'archived' AND l.is_active = true
GROUP BY 
    tu.project_slug, l.code, l.name;

-- 2. Glossary Enforcement Function
CREATE OR REPLACE FUNCTION check_translation_glossary()
RETURNS TRIGGER AS $$
DECLARE
    missing_terms TEXT := '';
    glossary_row RECORD;
    score_bump NUMERIC := 0;
    unit_source TEXT;
BEGIN
    -- Get source text
    SELECT source_text INTO unit_source FROM public.translation_units WHERE id = NEW.unit_id;

    -- Loop through glossary
    FOR glossary_row IN 
        SELECT term_en, term_target 
        FROM public.civic_glossary 
        WHERE lang_code = NEW.lang_code
    LOOP
        -- Check if source term exists in English
        IF unit_source ~* ('\y' || glossary_row.term_en || '\y') THEN
            -- Check if approved term is missing in Translation
            IF NOT (NEW.translated_text ~* ('\y' || glossary_row.term_target || '\y')) THEN
                missing_terms := missing_terms || glossary_row.term_en || ' (expected ' || glossary_row.term_target || '), ';
            ELSE
                score_bump := score_bump + 0.1;
            END IF;
        END IF;
    END LOOP;

    -- Update flags
    NEW.glossary_flags := COALESCE(NEW.glossary_flags, '[]'::jsonb);
    IF missing_terms <> '' THEN
        NEW.reviewer_notes := COALESCE(NEW.reviewer_notes, '') || ' [GLOSSARY ALERT: Missing ' || rtrim(missing_terms, ', ') || '] ';
        NEW.confidence_score := GREATEST(0.1, COALESCE(NEW.confidence_score, 0.5) - 0.2);
    ELSE
        NEW.confidence_score := LEAST(1.0, COALESCE(NEW.confidence_score, 0.5) + score_bump);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Bind Trigger
DROP TRIGGER IF EXISTS tr_check_glossary ON public.translation_submissions;
CREATE TRIGGER tr_check_glossary
BEFORE INSERT ON public.translation_submissions
FOR EACH ROW EXECUTE FUNCTION check_translation_glossary();

-- 4. Consensus Clustering RPC
CREATE OR REPLACE FUNCTION get_translation_consensus(p_unit_id UUID, p_lang_code TEXT)
RETURNS TABLE (
    translated_text TEXT,
    occurrence_count BIGINT,
    avg_confidence NUMERIC,
    subscriber_ids UUID[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ts.translated_text,
        COUNT(*)::BIGINT as occurrence_count,
        AVG(ts.confidence_score)::NUMERIC as avg_confidence,
        array_agg(ts.contributor_id) as subscriber_ids
    FROM 
        public.translation_submissions ts
    WHERE 
        ts.unit_id = p_unit_id 
        AND ts.lang_code = p_lang_code
        AND ts.status IN ('pending', 'approved')
    GROUP BY 
        ts.translated_text
    ORDER BY 
        occurrence_count DESC;
END;
$$ LANGUAGE plpgsql;

-- 5. Auto-Push to Bot Notification
-- (Logic for sending notifications via Edge Function would be handled via a DB Webhook in Dashboard)
