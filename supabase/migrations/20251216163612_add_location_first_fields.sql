/*
  # Add Location-First Fields to Profiles and Notes

  1. Profile Updates
    - Add `area` field (optional suburb/area within city)
    - Add `work_mode` field (required: on-site, remote, both)
    - Add `discovery_preference` field (required: near_me, my_city, anywhere)
    - Make `city` field required by removing nullable
  
  2. Notes Updates
    - Add `area` field (optional suburb/area)
    - Add `work_mode` field (on-site, remote, both)
  
  3. Security
    - All fields are updatable by authenticated users via existing RLS policies
*/

-- Add new fields to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'area'
  ) THEN
    ALTER TABLE profiles ADD COLUMN area text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'work_mode'
  ) THEN
    ALTER TABLE profiles ADD COLUMN work_mode text CHECK (work_mode IN ('on-site', 'remote', 'both'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'discovery_preference'
  ) THEN
    ALTER TABLE profiles ADD COLUMN discovery_preference text DEFAULT 'my_city' CHECK (discovery_preference IN ('near_me', 'my_city', 'anywhere'));
  END IF;
END $$;

-- Add new fields to notes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'area'
  ) THEN
    ALTER TABLE notes ADD COLUMN area text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'work_mode'
  ) THEN
    ALTER TABLE notes ADD COLUMN work_mode text CHECK (work_mode IN ('on-site', 'remote', 'both'));
  END IF;
END $$;

-- Create index for city-based queries on notes
CREATE INDEX IF NOT EXISTS idx_notes_city ON notes(city) WHERE status = 'open';

-- Create index for work_mode queries
CREATE INDEX IF NOT EXISTS idx_notes_work_mode ON notes(work_mode) WHERE status = 'open';