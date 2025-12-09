-- Fix column size limits that are too restrictive
-- Run this in Supabase SQL Editor

ALTER TABLE users 
  ALTER COLUMN website TYPE TEXT,
  ALTER COLUMN location TYPE TEXT;
