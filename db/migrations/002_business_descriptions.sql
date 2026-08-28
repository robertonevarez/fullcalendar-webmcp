ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

UPDATE businesses
SET description = 'Residential cleaning for homes across the El Paso area.'
WHERE slug = 'marias-cleaning' AND description = '';
