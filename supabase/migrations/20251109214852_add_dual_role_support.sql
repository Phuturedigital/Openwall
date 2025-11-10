/*
  # Add Dual Role Support

  ## Changes

  1. Schema Updates
    - Change `user_type` in profiles to allow multiple roles
    - Add `note_type` to notes table ('job' or 'service')
    - Job posts are created by clients, seen by vendors
    - Service offers are created by vendors, seen by clients

  2. Important Notes
    - Users can switch between viewing as client or vendor
    - The active role is stored client-side (localStorage)
    - Both roles share the same profile and credits
    - Notes are filtered based on viewer's active role

  3. Security
    - RLS policies updated to allow any authenticated user to post
    - Users can see notes of the opposite type (clients see services, vendors see jobs)
*/

-- Add note_type column to notes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'note_type'
  ) THEN
    ALTER TABLE notes ADD COLUMN note_type text NOT NULL DEFAULT 'job' CHECK (note_type IN ('job', 'service'));
  END IF;
END $$;

-- Update profiles to support dual roles (remove the strict user_type check)
-- The user_type will now indicate their current preference, but both roles are always available
DO $$
BEGIN
  -- Remove the old CHECK constraint if it exists
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;

  -- Add new constraint that allows both client and vendor
  ALTER TABLE profiles ADD CONSTRAINT profiles_user_type_check
    CHECK (user_type IN ('client', 'vendor'));
END $$;

-- Update RLS policies for notes to allow all authenticated users to post
DROP POLICY IF EXISTS "Clients can create notes" ON notes;

CREATE POLICY "Authenticated users can create notes"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add index for note_type for better query performance
CREATE INDEX IF NOT EXISTS idx_notes_note_type ON notes(note_type);

-- Add index for combined queries (type + priority + date)
CREATE INDEX IF NOT EXISTS idx_notes_type_priority_date
  ON notes(note_type, is_priority DESC, created_at DESC);
