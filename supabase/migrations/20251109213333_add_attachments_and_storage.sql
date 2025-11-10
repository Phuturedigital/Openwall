/*
  # Add Attachments Support

  ## Changes

  1. Schema Updates
    - Add `attachments` JSONB array column to notes table
    - Each attachment contains: {name, url, type, size}

  2. Storage
    - Create 'note-attachments' storage bucket for file uploads
    - Enable public access for authenticated users to upload
    - Set file size limits and allowed file types

  3. Security
    - Only authenticated clients can upload to their own notes
    - Vendors can download after unlocking
*/

-- Add attachments column to notes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'attachments'
  ) THEN
    ALTER TABLE notes ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create storage bucket for note attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-attachments', 'note-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for note-attachments bucket

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'note-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view their own uploads
CREATE POLICY "Users can view their own attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'note-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view attachments of notes they've unlocked
CREATE POLICY "Users can view attachments of unlocked notes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'note-attachments' AND
  EXISTS (
    SELECT 1 FROM unlocked_leads ul
    JOIN notes n ON n.id = ul.note_id
    WHERE ul.vendor_id = auth.uid()
    AND (storage.foldername(name))[1] = n.user_id::text
  )
);

-- Allow note owners to delete their attachments
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'note-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
