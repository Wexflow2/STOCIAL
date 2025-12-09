-- Comprehensive fix: Remove all VARCHAR limits that might cause issues
-- Run this in Supabase SQL Editor

-- Fix users table columns
ALTER TABLE users 
  ALTER COLUMN website TYPE TEXT,
  ALTER COLUMN location TYPE TEXT,
  ALTER COLUMN bio TYPE TEXT,
  ALTER COLUMN profile_picture_url TYPE TEXT,
  ALTER COLUMN cover_image_url TYPE TEXT,
  ALTER COLUMN avatar_url TYPE TEXT;

-- Fix social_links table if it exists
ALTER TABLE social_links 
  ALTER COLUMN url TYPE TEXT;
