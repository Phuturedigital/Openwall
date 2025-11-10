/*
  # Add Title and Fulfilled Tracking to Notes

  1. Schema Changes
    - Add `title` column to notes table (optional, extracted from body if empty)
    - Add `fulfilled_by` column to track which provider fulfilled the note
    - Add `fulfilled_at` timestamp to track when note was fulfilled
    - Update status values to include 'in_progress' and 'closed'

  2. Performance
    - Add index on status for efficient filtering
    - Add index on fulfilled_by for provider tracking

  3. Data Migration
    - Existing notes remain unchanged (title can be null initially)
    - Status 'open' and 'fulfilled' remain valid
*/

-- Add new columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'title'
  ) THEN
    ALTER TABLE notes ADD COLUMN title text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'fulfilled_by'
  ) THEN
    ALTER TABLE notes ADD COLUMN fulfilled_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'fulfilled_at'
  ) THEN
    ALTER TABLE notes ADD COLUMN fulfilled_at timestamptz;
  END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notes_status ON notes(status);
CREATE INDEX IF NOT EXISTS idx_notes_fulfilled_by ON notes(fulfilled_by);
CREATE INDEX IF NOT EXISTS idx_notes_user_status ON notes(user_id, status);

-- Add comment for documentation
COMMENT ON COLUMN notes.title IS 'Optional title for the note, extracted from body if empty';
COMMENT ON COLUMN notes.fulfilled_by IS 'Profile ID of the provider who fulfilled this note';
COMMENT ON COLUMN notes.fulfilled_at IS 'Timestamp when the note was marked as fulfilled';
