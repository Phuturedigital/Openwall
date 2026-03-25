-- Fix missing status values, notification note_id column, and attachments storage bucket

-- 1. Add 'deleted' to notes.status constraint
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_status_check;
ALTER TABLE notes ADD CONSTRAINT notes_status_check
  CHECK (status = ANY (ARRAY['open','in_progress','closed','fulfilled','deleted']));

-- 2. Add 'closed' to connection_requests.status constraint
ALTER TABLE connection_requests DROP CONSTRAINT IF EXISTS connection_requests_status_check;
ALTER TABLE connection_requests ADD CONSTRAINT connection_requests_status_check
  CHECK (status = ANY (ARRAY['pending','approved','declined','closed']));

-- 3. Add note_id column to notifications (if not already present)
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS note_id uuid REFERENCES notes(id) ON DELETE SET NULL;

-- 4. Create public 'attachments' storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','application/pdf',
        'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'video/mp4','video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage RLS policies for attachments bucket
CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "Public can view attachments"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'attachments');

CREATE POLICY "Users can delete own attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
