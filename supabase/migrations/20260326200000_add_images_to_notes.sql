-- Step 1: Add avatar_url to profiles + create avatars bucket + bump attachments to 20MB
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

UPDATE storage.buckets SET file_size_limit = 20971520 WHERE id = 'attachments';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET file_size_limit = 2097152, public = true;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
END $$;

CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Step 2: Add images column to notes + rebuild public_notes_feed with images and poster_avatar
ALTER TABLE notes ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb;

DROP VIEW IF EXISTS public_notes_feed;

CREATE VIEW public_notes_feed AS
SELECT
  n.id, n.title, n.body, n.category, n.budget, n.city, n.area, n.prio,
  n.prioritised_until, n.status, n.created_at, n.updated_at, n.work_mode, n.images,
  (n.prio AND (n.prioritised_until IS NULL OR n.prioritised_until > now())) AS is_currently_prioritised,
  CASE WHEN auth.uid() = n.user_id THEN true ELSE false END AS is_owner,
  COALESCE(NULLIF(TRIM(p.full_name), ''), SPLIT_PART(p.email, '@', 1)) AS poster_name,
  p.profession AS poster_profession,
  p.avatar_url AS poster_avatar,
  (SELECT COUNT(*)::integer FROM unlocks u WHERE u.note_id = n.id) AS unlock_count
FROM notes n
JOIN profiles p ON p.id = n.user_id
WHERE n.status = 'open';

GRANT SELECT ON public_notes_feed TO anon, authenticated;
