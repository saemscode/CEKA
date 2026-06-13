-- Migration: CEKA Search Infrastructure Hotfix
-- Fixes: get_enrichment_chip_counts, trending_cache, and community_posts -> discussions mapping

-- 1. Ensure preferences column exists on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"search_weights": {"match": 0.50, "recency": 0.30, "county": 0.20}, "type_affinity": {"bill": 1.0, "blog": 1.0, "resource": 1.0, "discussion": 1.0}}'::jsonb;

-- 2. Fixing get_enrichment_chip_counts to use 'discussions' instead of 'community_posts'
CREATE OR REPLACE FUNCTION get_enrichment_chip_counts(chip_tags text[])
RETURNS TABLE(tag text, count bigint) AS $$
BEGIN
  RETURN QUERY
  WITH all_tags AS (
    SELECT unnest(tags) AS tag FROM bills
    UNION ALL
    SELECT unnest(tags) AS tag FROM blog_posts WHERE status = 'published'
    UNION ALL
    SELECT unnest(tags) AS tag FROM resources
    UNION ALL
    SELECT unnest(tags) AS tag FROM discussions
  )
  SELECT t.tag, count(*) AS count
  FROM all_tags t
  WHERE t.tag = ANY(chip_tags)
  GROUP BY t.tag;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fixing Search Vector and Embedding for Discussions (if not already set via community_posts)
-- Check if community_posts existed and rename or just apply to discussions
DO $$
BEGIN
  -- Search Vector for discussions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'discussions' AND column_name = 'search_vector') THEN
    ALTER TABLE discussions 
      ADD COLUMN search_vector tsvector 
      GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
      ) STORED;
    CREATE INDEX IF NOT EXISTS discussions_search_vector_idx ON discussions USING GIN(search_vector);
  END IF;

  -- Embedding for discussions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'discussions' AND column_name = 'embedding') THEN
    ALTER TABLE discussions ADD COLUMN embedding vector(768);
    CREATE INDEX IF NOT EXISTS discussions_embedding_idx ON discussions USING hnsw (embedding vector_cosine_ops);
  END IF;
END $$;

-- 4. Ensure trending_cache references correct tables
CREATE TABLE IF NOT EXISTS trending_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id text NOT NULL,
  content_type text NOT NULL,
  title text,
  excerpt text,
  tags text[],
  county text,
  created_at timestamptz,
  url text,
  recency_score float,
  view_count integer DEFAULT 0,
  cached_at timestamptz DEFAULT now()
);

-- 5. Refresh trending_cache job update (if pg_cron exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('refresh-trending');
    PERFORM cron.schedule('refresh-trending', '*/15 * * * *', '
      DELETE FROM trending_cache;
      INSERT INTO trending_cache (content_id, content_type, title, excerpt, tags, county, created_at, url)
      SELECT id::text, ''bill'', title, summary, tags, county, created_at, ''/bills/'' || id
      FROM bills WHERE created_at > NOW() - INTERVAL ''72 hours''
      UNION ALL
      SELECT id::text, ''blog'', title, excerpt, tags, county, created_at, ''/blog/'' || slug
      FROM blog_posts WHERE created_at > NOW() - INTERVAL ''72 hours'' AND status = ''published''
      UNION ALL
      SELECT id::text, ''discussion'', title, LEFT(content, 200), tags, county, created_at, ''/community/discussion/'' || id
      FROM discussions WHERE created_at > NOW() - INTERVAL ''72 hours''
      ORDER BY created_at DESC LIMIT 20;
    ');
  END IF;
END $$;

-- Grant execution
GRANT EXECUTE ON FUNCTION get_enrichment_chip_counts(text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_community_intelligence() TO anon, authenticated;
