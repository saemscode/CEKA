-- Migration: Add branding columns to third_party_apps
-- Date: 2026-03-20
-- Purpose: Enable custom branding (logo, colors, descriptions, legal links) for OAuth consent UI

ALTER TABLE public.third_party_apps
  ADD COLUMN IF NOT EXISTS logo_url text NULL,
  ADD COLUMN IF NOT EXISTS description text NULL,
  ADD COLUMN IF NOT EXISTS website_url text NULL,
  ADD COLUMN IF NOT EXISTS brand_color text NULL DEFAULT '#007AFF',
  ADD COLUMN IF NOT EXISTS privacy_policy_url text NULL,
  ADD COLUMN IF NOT EXISTS terms_url text NULL;

COMMENT ON COLUMN public.third_party_apps.logo_url IS 'URL to the app logo displayed on the OAuth consent screen';
COMMENT ON COLUMN public.third_party_apps.description IS 'Short description of the app shown during OAuth consent';
COMMENT ON COLUMN public.third_party_apps.website_url IS 'Official website URL for the third-party app';
COMMENT ON COLUMN public.third_party_apps.brand_color IS 'Hex color code used for branding the consent UI (default: iOS Blue #007AFF)';
COMMENT ON COLUMN public.third_party_apps.privacy_policy_url IS 'URL to the app privacy policy';
COMMENT ON COLUMN public.third_party_apps.terms_url IS 'URL to the app terms of service';
