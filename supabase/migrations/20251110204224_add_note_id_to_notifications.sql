/*
  # Add note_id to notifications table
  
  1. Changes
    - Add `note_id` column to notifications table for direct note references
    - This allows better tracking and validation of notification context
  
  2. Notes
    - Column is nullable since some notifications (like system messages) may not relate to a specific note
    - Foreign key ensures data integrity with notes table
*/

-- Add note_id column to notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'note_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN note_id uuid REFERENCES notes(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_notifications_note_id ON notifications(note_id);
  END IF;
END $$;
