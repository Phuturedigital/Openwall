/*
  # Smart Note Management & Request Status Flow

  ## Updates to notes table
  1. Add status field for note lifecycle
    - status: 'open' | 'in_progress' | 'fulfilled' | 'deleted'
  2. Add updated_at timestamp with auto-update

  ## Updates to connection_requests table
  1. Update status options to include 'closed'
    - status: 'pending' | 'approved' | 'declined' | 'closed'

  ## Triggers and Functions
  1. Auto-update updated_at on notes
  2. Auto-close pending requests when note is fulfilled

  ## Security
  - RLS policies for note management
  - Only poster can edit/delete their notes
*/

-- Add status field to notes
ALTER TABLE notes ADD COLUMN IF NOT EXISTS status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'fulfilled', 'deleted'));
ALTER TABLE notes ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Update connection_requests status constraint
ALTER TABLE connection_requests DROP CONSTRAINT IF EXISTS connection_requests_status_check;
ALTER TABLE connection_requests ADD CONSTRAINT connection_requests_status_check 
  CHECK (status IN ('pending', 'approved', 'declined', 'closed'));

-- Create trigger to auto-update updated_at on notes
CREATE OR REPLACE FUNCTION update_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notes_updated_at_trigger ON notes;
CREATE TRIGGER notes_updated_at_trigger
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_notes_updated_at();

-- Create function to auto-close requests when note is fulfilled
CREATE OR REPLACE FUNCTION close_pending_requests_on_fulfill()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'fulfilled' AND OLD.status != 'fulfilled' THEN
    UPDATE connection_requests
    SET status = 'closed', notified = true
    WHERE note_id = NEW.id
    AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_close_requests_trigger ON notes;
CREATE TRIGGER auto_close_requests_trigger
  AFTER UPDATE ON notes
  FOR EACH ROW
  WHEN (NEW.status = 'fulfilled')
  EXECUTE FUNCTION close_pending_requests_on_fulfill();

-- Update RLS policies for note management
DROP POLICY IF EXISTS "Users can update own notes" ON notes;
CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notes" ON notes;
CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_notes_status ON notes(status);
CREATE INDEX IF NOT EXISTS idx_notes_user_status ON notes(user_id, status);
