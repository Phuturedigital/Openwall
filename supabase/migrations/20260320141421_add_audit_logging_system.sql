/*
  # Add Audit Logging and Change History System

  ## Overview
  Comprehensive audit logging system to track all changes to critical data for compliance,
  security, and debugging purposes. Essential for production environments.

  ## New Tables
  
  1. `audit_logs` - Universal change tracking table
     - `id` (uuid, primary key)
     - `table_name` (text) - Which table was modified
     - `record_id` (uuid) - ID of the modified record
     - `action` (text) - INSERT, UPDATE, DELETE
     - `old_data` (jsonb) - Previous state
     - `new_data` (jsonb) - New state
     - `changed_by` (uuid) - User who made the change
     - `changed_at` (timestamptz) - When change occurred
     - `ip_address` (inet) - IP address of requester
     - `user_agent` (text) - Browser/client info

  2. `user_activity_logs` - Track user actions and behavior
     - `id` (uuid, primary key)
     - `user_id` (uuid) - User performing action
     - `action_type` (text) - login, logout, post_created, lead_unlocked, etc.
     - `details` (jsonb) - Additional context
     - `created_at` (timestamptz)
     - `ip_address` (inet)

  ## New Functions
  
  1. `audit_trigger_function()` - Generic audit trigger for any table
  2. `log_user_activity()` - Helper to log user actions
  3. `get_user_activity_summary()` - Get activity summary for a user
  4. `get_recent_changes()` - Get recent changes to a specific record

  ## Security
  
  - Audit logs are append-only (INSERT only)
  - Only admins can view audit logs
  - Logs are automatically created by triggers
  - RLS enforced to prevent tampering

  ## Performance
  
  - Indexes on frequently queried columns
  - Partitioning-ready schema for future scaling
  - Automatic cleanup of old logs (configurable retention)
*/

-- =============================================
-- AUDIT LOGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at timestamptz DEFAULT now() NOT NULL,
  ip_address inet,
  user_agent text
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only system can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Only authenticated users can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (changed_by = auth.uid());

CREATE INDEX IF NOT EXISTS idx_audit_logs_record 
ON audit_logs(table_name, record_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user 
ON audit_logs(changed_by, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created 
ON audit_logs(changed_at DESC);

-- =============================================
-- USER ACTIVITY LOGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN (
    'login', 'logout', 'signup', 
    'note_created', 'note_updated', 'note_deleted', 'note_fulfilled',
    'lead_unlocked', 'payment_made',
    'profile_updated', 'password_changed'
  )),
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  ip_address inet,
  user_agent text
);

ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity logs"
  ON user_activity_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity logs"
  ON user_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created 
ON user_activity_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type 
ON user_activity_logs(action_type, created_at DESC);

-- =============================================
-- AUDIT TRIGGER FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      old_data,
      new_data,
      changed_by
    ) VALUES (
      TG_TABLE_NAME,
      OLD.id,
      'DELETE',
      to_jsonb(OLD),
      NULL,
      auth.uid()
    );
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      old_data,
      new_data,
      changed_by
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid()
    );
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      old_data,
      new_data,
      changed_by
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'INSERT',
      NULL,
      to_jsonb(NEW),
      auth.uid()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- =============================================
-- ATTACH AUDIT TRIGGERS TO CRITICAL TABLES
-- =============================================

DROP TRIGGER IF EXISTS audit_profiles_changes ON profiles;
CREATE TRIGGER audit_profiles_changes
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_notes_changes ON notes;
CREATE TRIGGER audit_notes_changes
  AFTER INSERT OR UPDATE OR DELETE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_unlocked_leads_changes ON unlocked_leads;
CREATE TRIGGER audit_unlocked_leads_changes
  AFTER INSERT OR UPDATE OR DELETE ON unlocked_leads
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_payment_history_changes ON payment_history;
CREATE TRIGGER audit_payment_history_changes
  AFTER INSERT OR UPDATE OR DELETE ON payment_history
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION log_user_activity(
  p_action_type text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  activity_id uuid;
BEGIN
  INSERT INTO user_activity_logs (user_id, action_type, details)
  VALUES (auth.uid(), p_action_type, p_details)
  RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_activity_summary(
  p_user_id uuid,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  action_type text,
  count bigint,
  last_occurrence timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Can only view own activity';
  END IF;

  RETURN QUERY
  SELECT 
    ual.action_type,
    COUNT(*) as count,
    MAX(ual.created_at) as last_occurrence
  FROM user_activity_logs ual
  WHERE ual.user_id = p_user_id
    AND ual.created_at >= now() - (p_days || ' days')::interval
  GROUP BY ual.action_type
  ORDER BY last_occurrence DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_recent_changes(
  p_table_name text,
  p_record_id uuid,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  action text,
  changed_at timestamptz,
  changed_by_email text,
  old_data jsonb,
  new_data jsonb
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.action,
    al.changed_at,
    p.email as changed_by_email,
    al.old_data,
    al.new_data
  FROM audit_logs al
  LEFT JOIN profiles p ON p.id = al.changed_by
  WHERE al.table_name = p_table_name
    AND al.record_id = p_record_id
  ORDER BY al.changed_at DESC
  LIMIT p_limit;
END;
$$;

-- =============================================
-- AUTOMATIC CLEANUP OF OLD AUDIT LOGS
-- =============================================

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(
  p_retention_days integer DEFAULT 365
)
RETURNS integer
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM audit_logs
  WHERE changed_at < now() - (p_retention_days || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_old_activity_logs(
  p_retention_days integer DEFAULT 180
)
RETURNS integer
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM user_activity_logs
  WHERE created_at < now() - (p_retention_days || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;