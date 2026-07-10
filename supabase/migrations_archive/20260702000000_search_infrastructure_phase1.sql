-- Migration: CEKA Search Infrastructure Phase 1
-- Adds: Full Text Search (tsvector), pgvector semantics, Search Analytics, Trending Cache

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Full-Text Search (tsvector) Setup
-- Bills
ALTER TABLE bills 
  ADD COLUMN IF NOT EXISTS search_vector tsvector 
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, ''))
  ) STORED;
CREATE INDEX IF NOT EXISTS bills_search_vector_idx ON bills USING GIN(search_vector);

-- Blog Posts
ALTER TABLE blog_posts 
  ADD COLUMN IF NOT EXISTS search_vector tsvector 
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, ''))
  ) STORED;
CREATE INDEX IF NOT EXISTS blog_posts_search_vector_idx ON blog_posts USING GIN(search_vector);

-- Resources
ALTER TABLE resources 
  ADD COLUMN IF NOT EXISTS search_vector tsvector 
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED;
CREATE INDEX IF NOT EXISTS resources_search_vector_idx ON resources USING GIN(search_vector);

-- Community Posts
ALTER TABLE community_posts 
  ADD COLUMN IF NOT EXISTS search_vector tsvector 
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) STORED;
CREATE INDEX IF NOT EXISTS community_posts_search_vector_idx ON community_posts USING GIN(search_vector);


-- 3. pgvector Semantic Search Embedding Columns
ALTER TABLE bills ADD COLUMN IF NOT EXISTS embedding vector(768);
CREATE INDEX IF NOT EXISTS bills_embedding_idx ON bills USING hnsw (embedding vector_cosine_ops);

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS embedding vector(768);
CREATE INDEX IF NOT EXISTS blog_posts_embedding_idx ON blog_posts USING hnsw (embedding vector_cosine_ops);

ALTER TABLE resources ADD COLUMN IF NOT EXISTS embedding vector(768);
CREATE INDEX IF NOT EXISTS resources_embedding_idx ON resources USING hnsw (embedding vector_cosine_ops);

ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS embedding vector(768);
CREATE INDEX IF NOT EXISTS community_posts_embedding_idx ON community_posts USING hnsw (embedding vector_cosine_ops);


-- 4. PostGIS Counties Table (Geographic Scoring Preparation)
CREATE TABLE IF NOT EXISTS counties (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  geom geometry(MultiPolygon, 4326)
);
CREATE INDEX IF NOT EXISTS counties_geom_idx ON counties USING GIST (geom);


-- 5. Search Analytics Table (search_events)
CREATE TABLE IF NOT EXISTS search_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  session_id text,
  query text NOT NULL,
  tokens text[],
  active_chips text[],
  results_count integer,
  result_types_returned text[],
  clicked_result_id text,
  clicked_result_type text,
  clicked_result_rank integer,
  clicked_relevance_score float,
  time_to_click_ms integer,
  zero_results boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);


-- 6. Trending Cache and pg_cron Materialization
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

-- Note: In Supabase, pg_cron is enabled via dashboard / extension page.
-- This schedules the refresh to run every 15 minutes.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule('refresh-trending', '*/15 * * * *', '
      DELETE FROM trending_cache;
      INSERT INTO trending_cache (content_id, content_type, title, excerpt, tags, county, created_at, url)
      SELECT id::text, ''bill'', title, summary, tags, county, created_at, ''/bills/'' || id
      FROM bills WHERE created_at > NOW() - INTERVAL ''72 hours''
      UNION ALL
      SELECT id::text, ''blog'', title, excerpt, tags, county, created_at, ''/blog/'' || slug
      FROM blog_posts WHERE created_at > NOW() - INTERVAL ''72 hours'' AND status = ''published''
      ORDER BY created_at DESC LIMIT 20;
    ');
  END IF;
END
$$;

-- 7. Personalization preferences column (if missing)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"search_weights": {"match": 0.50, "recency": 0.30, "county": 0.20}, "type_affinity": {"bill": 1.0, "blog": 1.0, "resource": 1.0, "discussion": 1.0}}'::jsonb;
