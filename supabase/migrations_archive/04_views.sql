-- SECTION 5: Recreate SECURITY DEFINER views as SECURITY INVOKER
-- ============================================================

-- 5a: unified_broadcast_list
DROP VIEW IF EXISTS public.unified_broadcast_list;
CREATE VIEW public.unified_broadcast_list
WITH (security_invoker = true)
AS
 SELECT community_members.id,
    community_members.email,
    community_members.first_name,
    community_members.last_name,
    COALESCE((community_members.first_name || ' '::text) || community_members.last_name,
             community_members.first_name,
             community_members.last_name,
             'Citizen'::text) AS display_name,
    community_members.county,
    community_members.interests,
    community_members.areas_of_interest,
    community_members.status AS membership_status,
    'community'::text AS source_table
   FROM community_members
UNION
 SELECT profiles.id,
    profiles.email,
    split_part(profiles.full_name, ' '::text, 1) AS first_name,
    SUBSTRING(profiles.full_name FROM POSITION((' '::text) IN (profiles.full_name)) + 1) AS last_name,
    profiles.full_name AS display_name,
    NULL::text AS county,
    NULL::text AS interests,
    '{}'::text[] AS areas_of_interest,
    'approved'::text AS membership_status,
    'profile'::text AS source_table
   FROM profiles
  WHERE NOT (profiles.email IN ( SELECT community_members.email FROM community_members));


-- 5b: translation_progress
DROP VIEW IF EXISTS public.translation_progress;
CREATE VIEW public.translation_progress
WITH (security_invoker = true)
AS
 SELECT tu.project_slug AS carousel_id,
    l.code AS lang_code,
    l.name AS language_name,
    count(tu.id) AS total_units,
    count(ts.id) FILTER (WHERE ts.status = 'approved'::text) AS approved_units,
    round(count(ts.id) FILTER (WHERE ts.status = 'approved'::text)::numeric
          / NULLIF(count(tu.id), 0)::numeric * 100::numeric, 2) AS progress_percentage
   FROM translation_units tu
     CROSS JOIN languages l
     LEFT JOIN translation_submissions ts ON tu.id = ts.unit_id AND l.code = ts.lang_code
  WHERE tu.status <> 'archived'::text AND l.is_active = true
  GROUP BY tu.project_slug, l.code, l.name;


-- ============================================================