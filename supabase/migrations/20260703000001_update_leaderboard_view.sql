-- Update leaderboard view to include username
DROP VIEW IF EXISTS public.leaderboard CASCADE;
CREATE VIEW public.leaderboard
WITH (security_invoker = true) AS
SELECT
    p.user_id,
    pr.full_name,
    pr.username,
    pr.avatar_url,
    p.total_points,
    p.current_level,
    RANK() OVER (ORDER BY p.total_points DESC) as rank
FROM public.user_points p
JOIN public.profiles pr ON p.user_id = pr.id
ORDER BY p.total_points DESC;

GRANT SELECT ON public.leaderboard TO authenticated;
GRANT SELECT ON public.leaderboard TO anon;
