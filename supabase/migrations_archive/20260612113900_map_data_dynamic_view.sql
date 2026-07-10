-- [GOHAM] MAP API SECURITY AND SCALABILITY VIEW
-- Creates a safe API boundary view exposing all non-binary columns for Edge Caching

CREATE OR REPLACE VIEW public.vw_iebc_offices_api AS
SELECT 
  id,
  constituency_name,
  office_location,
  constituency_code,
  landmark,
  distance_from_landmark,
  geocode_method,
  geocode_confidence,
  formatted_address,
  verified,
  notes,
  latitude,
  longitude
FROM public.iebc_offices;

-- Ensure view honors RLS (if any)
ALTER VIEW public.vw_iebc_offices_api SET (security_invoker = true);

-- Grant select access to anon and authenticated roles
GRANT SELECT ON public.vw_iebc_offices_api TO anon;
GRANT SELECT ON public.vw_iebc_offices_api TO authenticated;
