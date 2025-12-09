-- Add columns to stories table for video support
ALTER TABLE stories ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'image';
ALTER TABLE stories ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 5;
ALTER TABLE stories ALTER COLUMN image_url TYPE TEXT; -- Ensure it can hold long URLs
