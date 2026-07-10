-- [GOHAM] ADVANCED IEBC OFFICES SCHEMA
-- Expands table to match the high-precision geocoder output

-- Enable PostGIS if not enabled (required for geom column)
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE public.iebc_offices 
RENAME COLUMN constituency TO constituency_name;

ALTER TABLE public.iebc_offices 
RENAME COLUMN location TO office_location;

ALTER TABLE public.iebc_offices 
ADD COLUMN IF NOT EXISTS constituency_code TEXT,
ADD COLUMN IF NOT EXISTS landmark TEXT,
ADD COLUMN IF NOT EXISTS distance_from_landmark TEXT,
ADD COLUMN IF NOT EXISTS geocode_method TEXT,
ADD COLUMN IF NOT EXISTS geocode_confidence DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS formatted_address TEXT,
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS geom GEOMETRY(POINT, 4326);

-- Update geom from lat/lon if they exist
UPDATE public.iebc_offices 
SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND geom IS NULL;

-- Indexing for spatial performance
CREATE INDEX IF NOT EXISTS iebc_offices_geom_idx ON public.iebc_offices USING GIST (geom);
