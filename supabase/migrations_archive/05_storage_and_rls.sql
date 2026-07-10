-- SECTION 6: Fix public storage bucket over-broad SELECT policies
-- ============================================================

-- 6a: avatars bucket - remove duplicate listing policies, keep single read-by-name
DROP POLICY IF EXISTS "Public avatar read" ON storage.objects;
CREATE POLICY "Public avatar read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');
-- Note: bucket listing (directory scan) is controlled via the bucket public flag,
-- not SELECT policies. To disable listing, set the bucket to private and use signed URLs.
-- The above policy allows read-by-URL. Disable public bucket listing in the dashboard.

-- 6b: resources bucket - same fix
DROP POLICY IF EXISTS "Resources public read" ON storage.objects;
CREATE POLICY "Resources public read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'resources');

-- ============================================================
-- SECTION 7: Enable RLS on tables currently without it
-- ============================================================

ALTER TABLE IF EXISTS public.carousel_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.carousel_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_corrections ENABLE ROW LEVEL SECURITY;

-- Public read for carousel content (needed for the frontend)
DROP POLICY IF EXISTS "Public read carousel_batches" ON public.carousel_batches;
CREATE POLICY "Public read carousel_batches" ON public.carousel_batches
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read carousel_images" ON public.carousel_images;
CREATE POLICY "Public read carousel_images" ON public.carousel_images
  FOR SELECT USING (true);
-- Admin write only (via service role - no explicit policy needed as service_role bypasses RLS)

-- ============================================================