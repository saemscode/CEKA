-- 20260613000000_swahili_localization_dedup.sql
-- Consolidates duplicate "First Follower" English badge and strictly enforces Swahili hierarchy.

-- 1. Deduplicate English tracking badge and keep Swahili (Mfuasi)
DELETE FROM public.civic_badges WHERE name = 'First Follower';

-- 2. Update level configuration to culturally resonant Swahili ranking
UPDATE public.level_config SET title = 'Raia' WHERE level = 1;
UPDATE public.level_config SET title = 'Mfuatiliaji' WHERE level = 2;
UPDATE public.level_config SET title = 'Mzalendo' WHERE level = 3;
UPDATE public.level_config SET title = 'Mwanaharakati' WHERE level = 4;
UPDATE public.level_config SET title = 'Shujaa' WHERE level = 5;
