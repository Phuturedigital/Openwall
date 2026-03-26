-- Allow any authenticated user to read any profile.
-- Required so note owners can see the profile of whoever is requesting access.
-- The existing "Users can view own profile" policy only allows self-reads,
-- causing PostgREST joins in connection_requests queries to return null profiles.
CREATE POLICY "Authenticated users can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);
