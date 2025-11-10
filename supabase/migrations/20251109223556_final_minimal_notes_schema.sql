/*
  # Final Minimal Notes Schema

  ## Changes
  1. Migrate title + description → body
  2. Rename is_priority → prio
  3. Rename location → city
  4. Convert budget text → integer (cents)
  5. Add contact jsonb, files jsonb
  6. Remove unused columns
  7. Update indexes and policies
*/

-- Add new columns
ALTER TABLE notes ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS prio boolean DEFAULT false;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS contact jsonb;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS files jsonb DEFAULT '[]'::jsonb;

-- Migrate data from old columns
UPDATE notes SET body = COALESCE(title, '') || CASE WHEN description IS NOT NULL AND description != '' THEN E'\n\n' || description ELSE '' END WHERE body IS NULL;
UPDATE notes SET prio = COALESCE(is_priority, false) WHERE prio IS NULL;
UPDATE notes SET city = location WHERE city IS NULL;

-- Make body required
ALTER TABLE notes ALTER COLUMN body SET NOT NULL;

-- Convert budget from text to integer (cents)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'budget' AND data_type = 'text'
  ) THEN
    ALTER TABLE notes ADD COLUMN budget_temp integer;
    UPDATE notes SET budget_temp = 
      CASE 
        WHEN budget IS NULL OR budget = '' THEN NULL
        ELSE (regexp_replace(budget, '[^0-9]', '', 'g'))::integer * 100
      END;
    ALTER TABLE notes DROP COLUMN budget;
    ALTER TABLE notes RENAME COLUMN budget_temp TO budget;
  END IF;
END $$;

-- Drop old columns
ALTER TABLE notes DROP COLUMN IF EXISTS title;
ALTER TABLE notes DROP COLUMN IF EXISTS description;
ALTER TABLE notes DROP COLUMN IF EXISTS category;
ALTER TABLE notes DROP COLUMN IF EXISTS location;
ALTER TABLE notes DROP COLUMN IF EXISTS is_priority;
ALTER TABLE notes DROP COLUMN IF EXISTS priority_expires_at;
ALTER TABLE notes DROP COLUMN IF EXISTS updated_at;

-- Update indexes
DROP INDEX IF EXISTS idx_notes_type_prio;
DROP INDEX IF EXISTS idx_notes_note_type;
DROP INDEX IF EXISTS idx_notes_type_priority_date;
DROP INDEX IF EXISTS idx_notes_city;

CREATE INDEX IF NOT EXISTS idx_notes_prio_created ON notes(prio DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_city_prio ON notes(city, prio DESC, created_at DESC);

-- Update RLS policies
DROP POLICY IF EXISTS "Anyone can view notes basic info" ON notes;
DROP POLICY IF EXISTS "Anyone can view notes" ON notes;
DROP POLICY IF EXISTS "Authenticated users can create notes" ON notes;
DROP POLICY IF EXISTS "Clients can create notes" ON notes;
DROP POLICY IF EXISTS "Users can create notes" ON notes;
DROP POLICY IF EXISTS "Users can update own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON notes;

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
