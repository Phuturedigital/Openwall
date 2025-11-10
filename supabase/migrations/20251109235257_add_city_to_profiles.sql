/*
  # Add city column to profiles table

  1. Changes
    - Add `city` column to profiles table for location information
    - This allows users to specify their location, which is displayed on request cards

  2. Details
    - Column is nullable (optional field)
    - Text type for flexibility
    - No default value
*/

-- Add city column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city text;

-- Create index for city searches
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city) WHERE city IS NOT NULL;
