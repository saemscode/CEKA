-- Migration: CEKA Search Infrastructure Phase 2 - RPCs
-- Adds: Live chip counts aggregation and semantic query helpers

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
    SELECT unnest(tags) AS tag FROM community_posts
  )
  SELECT t.tag, count(*) AS count
  FROM all_tags t
  WHERE t.tag = ANY(chip_tags)
  GROUP BY t.tag;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
