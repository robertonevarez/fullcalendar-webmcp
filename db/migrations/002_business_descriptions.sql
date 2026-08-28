ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

UPDATE businesses
SET description = 'Maria''s Cleaning Service provides reliable residential cleaning for homes across the El Paso metro — from downtown apartments to Westside houses. We handle kitchens, bathrooms, living spaces, dusting, and floor care with eco-friendly products, flexible scheduling, and a team that treats every home with care. Whether you need a routine tidy-up or a deep refresh before guests arrive, we show up on time and leave your space sparkling.'
WHERE slug = 'marias-cleaning'
  AND (
    description = ''
    OR description = 'Residential cleaning for homes across the El Paso area.'
  );
