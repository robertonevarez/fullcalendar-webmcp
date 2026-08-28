ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

UPDATE businesses
SET description = 'Reliable residential cleaning across the El Paso area. Eco-friendly products, flexible scheduling, and a team that treats your home with care.'
WHERE slug = 'marias-cleaning'
  AND (
    description = ''
    OR description = 'Residential cleaning for homes across the El Paso area.'
    OR description LIKE 'Maria''s Cleaning Service provides%'
  );
