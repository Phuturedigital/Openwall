/*
  # Remove default value from intent field

  1. Changes
    - Remove default value from `profiles.intent` field
    - Make intent truly optional (nullable with no default)
  
  2. Notes
    - This allows users to choose their intent explicitly
    - No data migration needed as existing values are preserved
*/

ALTER TABLE profiles ALTER COLUMN intent DROP DEFAULT;
