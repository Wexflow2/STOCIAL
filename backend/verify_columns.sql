-- Check current column types in users table
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('website', 'location', 'name', 'username', 'email', 'bio')
ORDER BY column_name;
