-- ================================================
-- BROADCAST COMMAND CENTER UPGRADES
-- 2026-05-23: Unified List & Quota Tracking
-- ================================================

-- 1. UNIFIED BROADCAST LIST VIEW
-- ------------------------------------------
-- Combines profiles and community members into a single deduplicated list
-- Normalizes names for consistent personalization tags.

CREATE OR REPLACE VIEW public.unified_broadcast_list AS
SELECT 
    id,
    email,
    first_name,
    last_name,
    COALESCE(first_name || ' ' || last_name, first_name, last_name, 'Citizen') as display_name,
    county,
    interests,
    areas_of_interest,
    status as membership_status,
    'community'::text as source_table
FROM public.community_members
UNION
SELECT 
    id,
    email,
    split_part(full_name, ' ', 1) as first_name,
    substring(full_name from position(' ' in full_name) + 1) as last_name,
    full_name as display_name,
    NULL as county,
    NULL as interests,
    '{}'::text[] as areas_of_interest,
    'approved' as membership_status,
    'profile'::text as source_table
FROM public.profiles
WHERE email NOT IN (SELECT email FROM public.community_members);

-- Grant access to the view
GRANT SELECT ON public.unified_broadcast_list TO authenticated;
GRANT SELECT ON public.unified_broadcast_list TO service_role;

-- 2. MAILING MESH STATUS FUNCTIONS
-- ------------------------------------------
-- Helps the GUI display real-time quotas and health indicators

CREATE OR REPLACE FUNCTION public.get_mailing_mesh_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_resend_today bigint;
    v_brevo_today bigint;
BEGIN
    -- Count Resend usage from admin audit logs in the last 24h
    SELECT count(*) INTO v_resend_today
    FROM public.admin_audit_log
    WHERE action = 'send_broadcast'
      AND details->>'provider_used' = 'resend'
      AND created_at > now() - interval '24 hours';

    -- Count Brevo usage
    SELECT count(*) INTO v_brevo_today
    FROM public.admin_audit_log
    WHERE action = 'send_broadcast'
      AND details->>'provider_used' = 'brevo'
      AND created_at > now() - interval '24 hours';

    RETURN jsonb_build_object(
        'resend_today', COALESCE(v_resend_today, 0),
        'brevo_today', COALESCE(v_brevo_today, 0),
        'resend_limit', 100, -- Default Resend free tier limit
        'brevo_limit', 300,  -- Default Brevo free tier limit
        'last_updated', now()
    );
END;
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION public.get_mailing_mesh_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_mailing_mesh_status() TO service_role;
