-- Migration: update_type_affinity RPC for adaptive per-user search weights

CREATE OR REPLACE FUNCTION update_type_affinity(p_user_id uuid, p_type text)
RETURNS void AS $$
DECLARE
  v_prefs jsonb;
  v_affinity jsonb;
  v_current float;
BEGIN
  SELECT preferences INTO v_prefs FROM profiles WHERE id = p_user_id;

  -- Initialise if missing
  IF v_prefs IS NULL OR v_prefs->'type_affinity' IS NULL THEN
    v_affinity := '{"bill": 1.0, "blog": 1.0, "resource": 1.0, "discussion": 1.0}'::jsonb;
  ELSE
    v_affinity := v_prefs->'type_affinity';
  END IF;

  -- Read current value; default 1.0
  v_current := COALESCE((v_affinity->>p_type)::float, 1.0);

  -- Exponential moving average nudge: new_val = old * 0.9 + 0.1 * 1.2 (clicked)
  -- Caps at 1.5, floors at 0.5
  v_current := LEAST(1.5, GREATEST(0.5, v_current * 0.9 + 0.12));
  v_affinity := jsonb_set(v_affinity, ARRAY[p_type], to_jsonb(round(v_current::numeric, 4)));

  -- Decay all OTHER types slightly (collaborative filtering)
  DECLARE
    v_type text;
  BEGIN
    FOREACH v_type IN ARRAY ARRAY['bill', 'blog', 'resource', 'discussion'] LOOP
      IF v_type != p_type THEN
        DECLARE v_other float;
        BEGIN
          v_other := COALESCE((v_affinity->>v_type)::float, 1.0);
          v_other := LEAST(1.5, GREATEST(0.5, v_other * 0.97));
          v_affinity := jsonb_set(v_affinity, ARRAY[v_type], to_jsonb(round(v_other::numeric, 4)));
        END;
      END IF;
    END LOOP;
  END;

  -- Write back
  UPDATE profiles
  SET preferences = jsonb_set(
    COALESCE(preferences, '{}'::jsonb),
    '{type_affinity}',
    v_affinity
  )
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION update_type_affinity(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_enrichment_chip_counts(text[]) TO anon, authenticated;
