-- Fix infinite recursion in RLS policies for notes table
--
-- Root cause: chain was
--   connection_requests SELECT policy -> queries notes (with RLS)
--   -> notes SELECT policy queries unlocks (with RLS)
--   -> unlocks SELECT policy queries notes (with RLS)
--   -> infinite recursion
--
-- Fix: replace raw subquery EXISTS (SELECT 1 FROM notes ...) in unlocks
-- and connection_requests policies with a SECURITY DEFINER function that
-- reads notes.user_id directly, bypassing RLS and breaking the cycle.

CREATE OR REPLACE FUNCTION public.get_note_owner_id(p_note_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM notes WHERE id = p_note_id;
$$;

-- Fix unlocks: was querying notes WITH RLS causing recursion
DROP POLICY IF EXISTS "Note owners can see who unlocked" ON unlocks;
CREATE POLICY "Note owners can see who unlocked" ON unlocks
FOR SELECT USING (get_note_owner_id(note_id) = auth.uid());

-- Fix connection_requests: both policies queried notes WITH RLS causing recursion
DROP POLICY IF EXISTS "Posters can view requests for their notes" ON connection_requests;
CREATE POLICY "Posters can view requests for their notes" ON connection_requests
FOR SELECT USING (
  auth.uid() = freelancer_id
  OR get_note_owner_id(note_id) = auth.uid()
);

DROP POLICY IF EXISTS "Posters can update requests" ON connection_requests;
CREATE POLICY "Posters can update requests" ON connection_requests
FOR UPDATE USING (get_note_owner_id(note_id) = auth.uid());
