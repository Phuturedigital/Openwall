/*
  # Add Contact Field to Notes

  ## Changes

  1. Schema Updates
    - Add `contact` column to notes table for client contact information (WhatsApp or Email)
    - This is the information vendors will unlock by paying R10

  2. Important Notes
    - Contact field is optional during post creation
    - If not provided, the profile email/phone will be used as fallback
    - This allows clients to provide specific project contact info separate from their profile
*/

-- Add contact column to notes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'contact'
  ) THEN
    ALTER TABLE notes ADD COLUMN contact text;
  END IF;
END $$;
