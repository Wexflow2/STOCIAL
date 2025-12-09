-- Quick fix: Add missing columns to users table if they don't exist
-- Run this in Supabase SQL Editor

DO $$ 
BEGIN
  -- Add website column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='website') THEN
    ALTER TABLE users ADD COLUMN website VARCHAR(500);
  END IF;

  -- Add location column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='location') THEN
    ALTER TABLE users ADD COLUMN location VARCHAR(255);
  END IF;

  -- Add cover_image_url column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='cover_image_url') THEN
    ALTER TABLE users ADD COLUMN cover_image_url TEXT;
  END IF;

  -- Add username_changed column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='username_changed') THEN
    ALTER TABLE users ADD COLUMN username_changed BOOLEAN DEFAULT FALSE;
  END IF;
END $$;
