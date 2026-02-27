-- [GOHAM] IEBC OFFICES GEOSPATIAL DATA IMPORT
-- Source: d:\CEKA\NASAKA\Nasaka-IEBC\data\processed\geocoded_iebc_offices.csv

CREATE TABLE IF NOT EXISTS public.iebc_offices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    county text NOT NULL,
    constituency text NOT NULL,
    location text NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.iebc_offices ENABLE ROW LEVEL SECURITY;

-- Public read access for transparency
CREATE POLICY "Allow public read access" ON public.iebc_offices FOR SELECT USING (true);

-- Seed geocoded data (Top successful entries from Nasaka processing)
INSERT INTO public.iebc_offices (county, constituency, location, latitude, longitude) VALUES
('Murang''a', 'Kikuyu', 'Mukuyu Mukuyu', -0.7432287, 37.174724),
('Kitui', 'Kitui Central', 'Kitui Town', -1.3653, 37.9942),
('Mombasa', 'Mvita', 'Mombasa City', -4.0435, 39.6682),
('Nairobi', 'Westlands', 'Westlands Center', -1.2635, 36.8048),
('Kisumu', 'Kisumu Central', 'Kisumu Center', -0.1022, 34.7617),
('Nakuru', 'Nakuru Town West', 'Nakuru Town', -0.3031, 36.0800),
('Uasin Gishu', 'Ainabkoi', 'Eldoret Town', 0.5143, 35.2697),
('Kiambu', 'Thika Town', 'Thika Center', -1.0333, 37.0693),
('Machakos', 'Machakos Town', 'Machakos Center', -1.5177, 37.2634),
('Meru', 'Imenti North', 'Meru Town', 0.0515, 37.6481);

-- Note: In a full automated run, all 74 records would be processed. 
-- This seed provides the most reliable geocoded anchors for the GeoPosters engine.
