/*
  # Fix Security and Performance Issues

  ## Changes
  1. Add missing index for payment_history.note_id foreign key
  2. Remove unused indexes to reduce overhead
  3. Drop duplicate RLS policies
  4. Recreate all RLS policies with optimized auth.uid() calls using SELECT wrapper
  5. Fix function search paths for security

  ## Security Improvements
  - All auth.uid() calls wrapped in SELECT for query plan caching
  - Duplicate policies removed to avoid confusion
  - Function search paths secured
*/

-- 1. Add missing index for payment_history.note_id
CREATE INDEX IF NOT EXISTS idx_payment_history_note_id ON payment_history(note_id);

-- 2. Remove unused indexes
DROP INDEX IF EXISTS idx_notes_created_at;
DROP INDEX IF EXISTS idx_notes_city_prio;
DROP INDEX IF EXISTS idx_transactions_note;
DROP INDEX IF EXISTS idx_transactions_kind;
DROP INDEX IF EXISTS idx_connection_requests_note;
DROP INDEX IF EXISTS idx_connection_requests_status;
DROP INDEX IF EXISTS idx_unlocks_note;
DROP INDEX IF EXISTS idx_unlocks_freelancer;
DROP INDEX IF EXISTS idx_notes_status;
DROP INDEX IF EXISTS idx_notes_user_status;
DROP INDEX IF EXISTS idx_profiles_city;

-- 3. Fix function search paths
ALTER FUNCTION update_last_active() SET search_path = pg_catalog, public;
ALTER FUNCTION update_updated_at_column() SET search_path = pg_catalog, public;
ALTER FUNCTION update_notes_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION close_pending_requests_on_fulfill() SET search_path = pg_catalog, public;

-- 4. Drop all existing RLS policies to recreate them optimized
-- Profiles policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view public profile info" ON profiles;

-- Notes policies
DROP POLICY IF EXISTS "Anyone can view notes" ON notes;
DROP POLICY IF EXISTS "Public can view all notes" ON notes;
DROP POLICY IF EXISTS "Users can create notes" ON notes;
DROP POLICY IF EXISTS "Clients can update their own notes" ON notes;
DROP POLICY IF EXISTS "Users can update own notes" ON notes;
DROP POLICY IF EXISTS "Clients can delete their own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON notes;

-- Connection requests policies
DROP POLICY IF EXISTS "Freelancers can view own requests" ON connection_requests;
DROP POLICY IF EXISTS "Posters can view requests for their notes" ON connection_requests;
DROP POLICY IF EXISTS "Freelancers can create requests" ON connection_requests;
DROP POLICY IF EXISTS "Posters can update requests for their notes" ON connection_requests;

-- Unlocks policies
DROP POLICY IF EXISTS "Freelancers can view own unlocks" ON unlocks;
DROP POLICY IF EXISTS "Posters can view unlocks for their notes" ON unlocks;
DROP POLICY IF EXISTS "Freelancers can create unlocks" ON unlocks;

-- Transactions policies
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can create own transactions" ON transactions;

-- Payment history policies
DROP POLICY IF EXISTS "Users can view their own payment history" ON payment_history;
DROP POLICY IF EXISTS "Users can create payment records" ON payment_history;

-- 5. Create optimized RLS policies with SELECT wrapper

-- PROFILES TABLE
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- NOTES TABLE
CREATE POLICY "Public can view all notes"
  ON notes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can create notes"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- CONNECTION REQUESTS TABLE
CREATE POLICY "Users can view own requests"
  ON connection_requests FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = freelancer_id
    OR EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = connection_requests.note_id
      AND notes.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Freelancers can create requests"
  ON connection_requests FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = freelancer_id);

CREATE POLICY "Posters can update requests"
  ON connection_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = connection_requests.note_id
      AND notes.user_id = (SELECT auth.uid())
    )
  );

-- UNLOCKS TABLE
CREATE POLICY "Users can view own unlocks"
  ON unlocks FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = freelancer_id
    OR EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = unlocks.note_id
      AND notes.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Freelancers can create unlocks"
  ON unlocks FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = freelancer_id);

-- TRANSACTIONS TABLE
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- PAYMENT HISTORY TABLE
CREATE POLICY "Users can view own payment history"
  ON payment_history FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create payment records"
  ON payment_history FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
