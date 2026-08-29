ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS photos_json JSONB NOT NULL DEFAULT '[]'::jsonb;
