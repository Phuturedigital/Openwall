/*
  # Simplify to Minimal Notes System

  ## Changes

  1. Notes Table - Minimal Schema
    - Keep only: id, body, budget, city, files, contact, prio, color, user_id, created_at
    - Remove: type, category, title, description, location, lock, priority_expires_at, updated_at
    - Rename description → body
    - Store contact as jsonb {email, phone}
    - Color is auto-assigned from palette

  2. Profiles Table
    - Remove role/user_type logic
    - Keep minimal fields

  3. Remove Complexity
    - No vendor/provider roles
    - No service offers
    - Only client needs

  ## Security
    - RLS remains for viewing own notes and unlocking
*/

-- Simplify notes table to minimal schema
DO $$
BEGIN
  -- Add body column (will replace title + description)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'body'
  ) THEN
    ALTER TABLE notes ADD COLUMN body text;

    -- Migrate existing data: combine title and description into body
    UPDATE notes SET body = COALESCE(title, '') || E'\n\n' || COALESCE(description, '')
    WHERE body IS NULL;

    -- Make body required
    ALTER TABLE notes ALTER COLUMN body SET NOT NULL;
  END IF;

  -- Ensure city column exists (renamed from location)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'location'
  ) THEN
    ALTER TABLE notes RENAME COLUMN location TO city;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'city'
  ) THEN
    ALTER TABLE notes ADD COLUMN city text;
  END IF;

  -- Ensure files column exists (renamed from attachments)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'attachments'
  ) THEN
    ALTER TABLE notes RENAME COLUMN attachments TO files;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'files'
  ) THEN
    ALTER TABLE notes ADD COLUMN files jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- Ensure contact is jsonb
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'contact' AND data_type = 'text'
  ) THEN
    ALTER TABLE notes ALTER COLUMN contact TYPE jsonb USING
      CASE
        WHEN contact IS NULL THEN NULL
        ELSE jsonb_build_object('phone', contact)
      END;
  END IF;

  -- Ensure color exists with default
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'color'
  ) THEN
    ALTER TABLE notes ADD COLUMN color text DEFAULT '#FEF3C7';
  END IF;
END $$;

-- Drop columns we no longer need
ALTER TABLE notes DROP COLUMN IF EXISTS title;
ALTER TABLE notes DROP COLUMN IF EXISTS description;
ALTER TABLE notes DROP COLUMN IF EXISTS category;
ALTER TABLE notes DROP COLUMN IF EXISTS type;
ALTER TABLE notes DROP COLUMN IF EXISTS note_type;
ALTER TABLE notes DROP COLUMN IF EXISTS location;
ALTER TABLE notes DROP COLUMN IF EXISTS attachments;
ALTER TABLE notes DROP COLUMN IF EXISTS lock;
ALTER TABLE notes DROP COLUMN IF EXISTS is_priority;
ALTER TABLE notes DROP COLUMN IF EXISTS priority_expires_at;
ALTER TABLE notes DROP COLUMN IF EXISTS updated_at;

-- Update indexes for new schema
DROP INDEX IF EXISTS idx_notes_type_prio;
DROP INDEX IF EXISTS idx_notes_note_type;
DROP INDEX IF EXISTS idx_notes_type_priority_date;
DROP INDEX IF EXISTS idx_notes_city;

CREATE INDEX IF NOT EXISTS idx_notes_prio_created ON notes(prio DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_city_prio ON notes(city, prio DESC, created_at DESC);

-- Simplify profiles (remove role complexity)
ALTER TABLE profiles DROP COLUMN IF EXISTS role;
ALTER TABLE profiles DROP COLUMN IF EXISTS user_type;
ALTER TABLE profiles DROP COLUMN IF EXISTS skills;
ALTER TABLE profiles DROP COLUMN IF EXISTS verified;

-- Update RLS policies for simplified schema
DROP POLICY IF EXISTS "Anyone can view notes basic info" ON notes;
DROP POLICY IF EXISTS "Authenticated users can create notes" ON notes;
DROP POLICY IF EXISTS "Clients can create notes" ON notes;

CREATE POLICY "Anyone can view notes"
  ON notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create notes"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
