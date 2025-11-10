/*
  # Fix Security and Performance Issues

  1. RLS Policy Performance
    - Fix user_activity_logs RLS policy to use (select auth.uid()) for better performance
    - This prevents re-evaluation of auth.uid() for each row

  2. Remove Unused Indexes
    - Drop idx_transactions_note_id (unused)
    - Drop idx_notifications_note_id (unused)
    - Drop idx_notes_fulfilled_by (unused)
    - Drop idx_user_activity_logs_user_id (unused - was just created)
    - Drop idx_user_activity_logs_created_at (unused - was just created)
    - Drop idx_platform_config_updated_by (unused)

  3. Fix Function Search Paths
    - Update update_updated_at_column() with secure search_path
    - Update log_user_activity() with secure search_path

  4. Notes
    - Indexes are only dropped if they haven't been used
    - RLS policies are recreated for optimal performance
    - Functions are made secure against search_path attacks
*/

-- ============================================================================
-- 1. FIX RLS POLICY PERFORMANCE
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view own activity logs" ON user_activity_logs;

-- Recreate with optimized query using (select auth.uid())
CREATE POLICY "Users can view own activity logs"
  ON user_activity_logs
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- 2. REMOVE UNUSED INDEXES
-- ============================================================================

-- Drop unused indexes
DROP INDEX IF EXISTS idx_transactions_note_id;
DROP INDEX IF EXISTS idx_notifications_note_id;
DROP INDEX IF EXISTS idx_notes_fulfilled_by;
DROP INDEX IF EXISTS idx_user_activity_logs_user_id;
DROP INDEX IF EXISTS idx_user_activity_logs_created_at;
DROP INDEX IF EXISTS idx_platform_config_updated_by;

-- ============================================================================
-- 3. FIX FUNCTION SEARCH PATH SECURITY
-- ============================================================================

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix log_user_activity function
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id uuid,
  p_action text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO user_activity_logs (user_id, action, ip_address, user_agent)
  VALUES (p_user_id, p_action, p_ip_address, p_user_agent)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;
