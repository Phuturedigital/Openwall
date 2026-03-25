-- Recreate public_notes_feed view to include is_owner field
-- This allows clients to determine note ownership without exposing user_id.
-- is_owner uses auth.uid() so it is always evaluated server-side.

DROP VIEW IF EXISTS public_notes_feed;

CREATE VIEW public_notes_feed AS
SELECT
  n.id,
  n.title,
  n.body,
  n.category,
  n.budget,
  n.city,
  n.area,
  n.prio,
  n.prioritised_until,
  n.status,
  n.created_at,
  n.updated_at,
  n.work_mode,
  (n.prio AND (n.prioritised_until IS NULL OR n.prioritised_until > now())) AS is_currently_prioritised,
  CASE WHEN auth.uid() = n.user_id THEN true ELSE false END AS is_owner,
  p.full_name AS poster_name,
  p.profession AS poster_profession,
  (
    SELECT COUNT(*)::integer
    FROM unlocks u
    WHERE u.note_id = n.id
  ) AS unlock_count
FROM notes n
JOIN profiles p ON p.id = n.user_id
WHERE n.status = 'open';

GRANT SELECT ON public_notes_feed TO anon, authenticated;
