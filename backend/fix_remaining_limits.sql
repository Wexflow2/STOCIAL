-- Fix remaining VARCHAR limits
-- Run this in Supabase SQL Editor

ALTER TABLE users 
  ALTER COLUMN name TYPE TEXT,
  ALTER COLUMN username TYPE VARCHAR(100),
  ALTER COLUMN profile_picture_url TYPE TEXT,
  ALTER COLUMN cover_image_url TYPE TEXT,
  ALTER COLUMN avatar_url TYPE TEXT;
