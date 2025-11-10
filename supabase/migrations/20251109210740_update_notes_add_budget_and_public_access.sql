/*
  # Update Notes Schema for Public Access and Budget

  ## Changes
  
  1. Schema Updates
    - Add `budget` column to notes table for displaying project budget
    - Add `priority_expires_at` column to track 48-hour priority period
  
  2. Security Changes
    - Update notes policies to allow public read access (no auth required)
    - Keep write operations restricted to authenticated clients
    - Add policy for vendors to check if they've unlocked a note
  
  3. Important Notes
    - Unauthenticated users can now browse all notes
    - Contact details will be handled in the app layer (blurred for non-unlocked)
    - Priority posts will show gradient border and expire after 48 hours
*/

-- Add budget column to notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'budget'
  ) THEN
    ALTER TABLE notes ADD COLUMN budget text;
  END IF;
END $$;

-- Add priority_expires_at column to track when priority expires
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'priority_expires_at'
  ) THEN
    ALTER TABLE notes ADD COLUMN priority_expires_at timestamptz;
  END IF;
END $$;

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Anyone can view all notes" ON notes;

-- Create new public read policy (no auth required)
CREATE POLICY "Public can view all notes"
  ON notes FOR SELECT
  TO anon, authenticated
  USING (true);

-- Keep existing write policies for clients
-- (Clients can create notes policy already exists)
-- (Clients can update their own notes policy already exists)
-- (Clients can delete their own notes policy already exists)

-- Add function to check if vendor has unlocked a note
CREATE OR REPLACE FUNCTION has_unlocked_note(note_uuid uuid, vendor_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM unlocked_leads
    WHERE note_id = note_uuid AND vendor_id = vendor_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policy for vendors to see if they unlocked a note (useful for UI)
DROP POLICY IF EXISTS "Public can view unlocked status" ON unlocked_leads;

-- Update unlocked_leads to allow checking if a note is unlocked
CREATE POLICY "Anyone can check unlock status"
  ON unlocked_leads FOR SELECT
  TO anon, authenticated
  USING (true);
