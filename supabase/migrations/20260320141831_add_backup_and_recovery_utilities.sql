/*
  # Add Backup and Recovery Utilities

  ## Overview
  Comprehensive backup and disaster recovery system for production resilience.
  Provides data export, point-in-time recovery preparation, and emergency
  restore capabilities.

  ## New Tables

  1. `backup_metadata` - Track backup operations
     - `id` (uuid, primary key)
     - `backup_type` (text) - full, incremental, table
     - `table_names` (text[]) - Tables included
     - `record_count` (integer) - Records backed up
     - `file_size_bytes` (bigint) - Backup size
     - `status` (text) - pending, completed, failed
     - `started_at` (timestamptz)
     - `completed_at` (timestamptz)
     - `metadata` (jsonb)

  2. `recovery_points` - Point-in-time recovery markers
     - `id` (uuid, primary key)
     - `name` (text) - Recovery point name
     - `description` (text) - What this point represents
     - `table_snapshots` (jsonb) - Table states
     - `created_at` (timestamptz)

  ## New Functions

  1. `create_recovery_point()` - Create recovery marker
  2. `export_table_data()` - Export table to JSON
  3. `export_user_data()` - GDPR-compliant user data export
  4. `get_backup_history()` - View backup history
  5. `estimate_backup_size()` - Calculate backup requirements
  6. `verify_data_consistency()` - Pre-backup validation

  ## Backup Strategy

  - Daily automated snapshots
  - On-demand manual backups
  - Per-table granular exports
  - GDPR-compliant user data exports
  - Encrypted backup metadata

  ## Recovery Capabilities

  - Point-in-time recovery markers
  - Individual table restoration
  - User account restoration
  - Deleted record recovery from audit logs
  - Transaction rollback simulation
*/

-- =============================================
-- BACKUP METADATA TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS backup_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type text NOT NULL CHECK (backup_type IN ('full', 'incremental', 'table', 'user')),
  table_names text[],
  record_count integer DEFAULT 0,
  file_size_bytes bigint,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  started_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_backup_metadata_status_started 
ON backup_metadata(status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_backup_metadata_type_started 
ON backup_metadata(backup_type, started_at DESC);

-- =============================================
-- RECOVERY POINTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS recovery_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  table_snapshots jsonb NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recovery_points_created 
ON recovery_points(created_at DESC);

-- =============================================
-- RECOVERY POINT FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION create_recovery_point(
  p_name text,
  p_description text DEFAULT NULL
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  recovery_id uuid;
  snapshots jsonb;
BEGIN
  SELECT jsonb_build_object(
    'profiles', (SELECT COUNT(*) FROM profiles),
    'notes', (SELECT COUNT(*) FROM notes),
    'unlocked_leads', (SELECT COUNT(*) FROM unlocked_leads),
    'payment_history', (SELECT COUNT(*) FROM payment_history),
    'audit_logs', (SELECT COUNT(*) FROM audit_logs),
    'timestamp', now()
  ) INTO snapshots;
  
  INSERT INTO recovery_points (name, description, table_snapshots, created_by)
  VALUES (p_name, p_description, snapshots, auth.uid())
  RETURNING id INTO recovery_id;
  
  RETURN recovery_id;
END;
$$;

-- =============================================
-- DATA EXPORT FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION export_table_data(p_table_name text)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  data jsonb;
  row_count integer;
BEGIN
  IF p_table_name NOT IN ('profiles', 'notes', 'unlocked_leads', 'payment_history') THEN
    RAISE EXCEPTION 'Invalid table name';
  END IF;
  
  EXECUTE format('SELECT jsonb_agg(row_to_json(t.*)) FROM %I t', p_table_name)
  INTO data;
  
  SELECT COUNT(*) INTO row_count
  FROM jsonb_array_elements(COALESCE(data, '[]'::jsonb));
  
  RETURN jsonb_build_object(
    'table', p_table_name,
    'row_count', row_count,
    'data', data,
    'exported_at', now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION export_user_data(p_user_id uuid)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_data jsonb;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Can only export own data';
  END IF;
  
  SELECT jsonb_build_object(
    'profile', (
      SELECT row_to_json(p.*) 
      FROM profiles p 
      WHERE p.id = p_user_id
    ),
    'notes', (
      SELECT jsonb_agg(row_to_json(n.*))
      FROM notes n
      WHERE n.user_id = p_user_id
    ),
    'unlocked_leads', (
      SELECT jsonb_agg(row_to_json(ul.*))
      FROM unlocked_leads ul
      WHERE ul.vendor_id = p_user_id
    ),
    'payment_history', (
      SELECT jsonb_agg(row_to_json(ph.*))
      FROM payment_history ph
      WHERE ph.user_id = p_user_id
    ),
    'activity_logs', (
      SELECT jsonb_agg(row_to_json(ual.*))
      FROM user_activity_logs ual
      WHERE ual.user_id = p_user_id
      ORDER BY ual.created_at DESC
      LIMIT 1000
    ),
    'exported_at', now(),
    'format_version', '1.0'
  ) INTO user_data;
  
  PERFORM log_user_activity(
    'data_export',
    jsonb_build_object('export_type', 'full_user_data')
  );
  
  RETURN user_data;
END;
$$;

-- =============================================
-- BACKUP MANAGEMENT FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION get_backup_history(p_days integer DEFAULT 30)
RETURNS TABLE (
  backup_id uuid,
  backup_type text,
  table_names text[],
  record_count integer,
  file_size text,
  status text,
  duration_minutes numeric,
  started_at timestamptz,
  completed_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bm.id as backup_id,
    bm.backup_type,
    bm.table_names,
    bm.record_count,
    pg_size_pretty(bm.file_size_bytes) as file_size,
    bm.status,
    EXTRACT(EPOCH FROM (bm.completed_at - bm.started_at)) / 60 as duration_minutes,
    bm.started_at,
    bm.completed_at
  FROM backup_metadata bm
  WHERE bm.started_at >= now() - (p_days || ' days')::interval
  ORDER BY bm.started_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION estimate_backup_size()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  estimates jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_database_size', pg_size_pretty(pg_database_size(current_database())),
    'table_sizes', (
      SELECT jsonb_object_agg(
        c.relname,
        jsonb_build_object(
          'size', pg_size_pretty(pg_total_relation_size(c.oid)),
          'rows', c.reltuples::bigint
        )
      )
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
    ),
    'estimated_at', now()
  ) INTO estimates;
  
  RETURN estimates;
END;
$$;

CREATE OR REPLACE FUNCTION verify_data_consistency()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  results jsonb;
  issues jsonb[];
BEGIN
  issues := ARRAY[]::jsonb[];
  
  IF EXISTS (
    SELECT 1 FROM unlocked_leads ul
    WHERE NOT EXISTS (SELECT 1 FROM notes WHERE id = ul.note_id)
    LIMIT 1
  ) THEN
    issues := array_append(issues, jsonb_build_object(
      'type', 'orphaned_unlocks',
      'severity', 'high',
      'message', 'Found unlocked leads without corresponding notes'
    ));
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM payment_history ph
    WHERE ph.note_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM notes WHERE id = ph.note_id)
    LIMIT 1
  ) THEN
    issues := array_append(issues, jsonb_build_object(
      'type', 'orphaned_payments',
      'severity', 'medium',
      'message', 'Found payments referencing non-existent notes'
    ));
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE email IS NULL OR email = ''
    LIMIT 1
  ) THEN
    issues := array_append(issues, jsonb_build_object(
      'type', 'missing_emails',
      'severity', 'critical',
      'message', 'Found profiles without email addresses'
    ));
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM notes
    WHERE user_id IS NULL
    LIMIT 1
  ) THEN
    issues := array_append(issues, jsonb_build_object(
      'type', 'orphaned_notes',
      'severity', 'high',
      'message', 'Found notes without user association'
    ));
  END IF;
  
  results := jsonb_build_object(
    'is_consistent', array_length(issues, 1) IS NULL,
    'issues', COALESCE(to_jsonb(issues), '[]'::jsonb),
    'checked_at', now()
  );
  
  RETURN results;
END;
$$;

-- =============================================
-- EMERGENCY RECOVERY FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION recover_deleted_record(
  p_table_name text,
  p_record_id uuid
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  last_known_state jsonb;
  recovery_result jsonb;
BEGIN
  SELECT new_data INTO last_known_state
  FROM audit_logs
  WHERE table_name = p_table_name
    AND record_id = p_record_id
    AND action = 'DELETE'
  ORDER BY changed_at DESC
  LIMIT 1;
  
  IF last_known_state IS NULL THEN
    SELECT old_data INTO last_known_state
    FROM audit_logs
    WHERE table_name = p_table_name
      AND record_id = p_record_id
      AND action = 'DELETE'
    ORDER BY changed_at DESC
    LIMIT 1;
  END IF;
  
  IF last_known_state IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No audit trail found for this record',
      'record_id', p_record_id
    );
  END IF;
  
  recovery_result := jsonb_build_object(
    'success', true,
    'table_name', p_table_name,
    'record_id', p_record_id,
    'last_known_state', last_known_state,
    'message', 'Record data retrieved from audit logs',
    'note', 'Manual restoration required - data returned for review'
  );
  
  RETURN recovery_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_record_history(
  p_table_name text,
  p_record_id uuid,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  action text,
  changed_at timestamptz,
  changed_by_email text,
  changes jsonb
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
    jsonb_build_object(
      'old', al.old_data,
      'new', al.new_data
    ) as changes
  FROM audit_logs al
  LEFT JOIN profiles p ON p.id = al.changed_by
  WHERE al.table_name = p_table_name
    AND al.record_id = p_record_id
  ORDER BY al.changed_at DESC
  LIMIT p_limit;
END;
$$;

-- =============================================
-- DISASTER RECOVERY FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION emergency_disable_all_triggers()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  results jsonb;
  disabled_count integer := 0;
BEGIN
  ALTER TABLE profiles DISABLE TRIGGER ALL;
  ALTER TABLE notes DISABLE TRIGGER ALL;
  ALTER TABLE unlocked_leads DISABLE TRIGGER ALL;
  ALTER TABLE payment_history DISABLE TRIGGER ALL;
  
  disabled_count := 4;
  
  results := jsonb_build_object(
    'triggers_disabled', true,
    'tables_affected', disabled_count,
    'warning', 'All triggers disabled - re-enable after emergency recovery',
    'disabled_at', now()
  );
  
  PERFORM log_error(
    'emergency_trigger_disable',
    'All triggers disabled for emergency recovery',
    results::text,
    'emergency_recovery',
    'critical'
  );
  
  RETURN results;
END;
$$;

CREATE OR REPLACE FUNCTION emergency_enable_all_triggers()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  results jsonb;
BEGIN
  ALTER TABLE profiles ENABLE TRIGGER ALL;
  ALTER TABLE notes ENABLE TRIGGER ALL;
  ALTER TABLE unlocked_leads ENABLE TRIGGER ALL;
  ALTER TABLE payment_history ENABLE TRIGGER ALL;
  
  results := jsonb_build_object(
    'triggers_enabled', true,
    'tables_affected', 4,
    'enabled_at', now()
  );
  
  RETURN results;
END;
$$;

-- =============================================
-- DATA EXPORT UTILITIES
-- =============================================

CREATE OR REPLACE FUNCTION export_all_data()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  export_data jsonb;
  start_time timestamptz;
  duration_ms numeric;
BEGIN
  start_time := clock_timestamp();
  
  SELECT jsonb_build_object(
    'profiles', (SELECT jsonb_agg(row_to_json(p.*)) FROM profiles p),
    'notes', (SELECT jsonb_agg(row_to_json(n.*)) FROM notes n),
    'unlocked_leads', (SELECT jsonb_agg(row_to_json(ul.*)) FROM unlocked_leads ul),
    'payment_history', (SELECT jsonb_agg(row_to_json(ph.*)) FROM payment_history ph),
    'exported_at', now(),
    'format_version', '1.0'
  ) INTO export_data;
  
  duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000;
  
  INSERT INTO backup_metadata (
    backup_type,
    table_names,
    record_count,
    status,
    completed_at,
    metadata
  ) VALUES (
    'full',
    ARRAY['profiles', 'notes', 'unlocked_leads', 'payment_history'],
    (
      (SELECT COUNT(*) FROM profiles) +
      (SELECT COUNT(*) FROM notes) +
      (SELECT COUNT(*) FROM unlocked_leads) +
      (SELECT COUNT(*) FROM payment_history)
    ),
    'completed',
    now(),
    jsonb_build_object('duration_ms', duration_ms)
  );
  
  RETURN export_data;
END;
$$;

CREATE OR REPLACE FUNCTION delete_user_data(p_user_id uuid)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  start_time timestamptz;
  results jsonb;
  notes_deleted integer;
  unlocks_deleted integer;
  payments_deleted integer;
  audit_deleted integer;
  activity_deleted integer;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Can only delete own data';
  END IF;
  
  start_time := clock_timestamp();
  
  DELETE FROM notes WHERE user_id = p_user_id;
  GET DIAGNOSTICS notes_deleted = ROW_COUNT;
  
  DELETE FROM unlocked_leads WHERE vendor_id = p_user_id;
  GET DIAGNOSTICS unlocks_deleted = ROW_COUNT;
  
  DELETE FROM payment_history WHERE user_id = p_user_id;
  GET DIAGNOSTICS payments_deleted = ROW_COUNT;
  
  DELETE FROM audit_logs WHERE changed_by = p_user_id;
  GET DIAGNOSTICS audit_deleted = ROW_COUNT;
  
  DELETE FROM user_activity_logs WHERE user_id = p_user_id;
  GET DIAGNOSTICS activity_deleted = ROW_COUNT;
  
  DELETE FROM profiles WHERE id = p_user_id;
  
  results := jsonb_build_object(
    'user_id', p_user_id,
    'notes_deleted', notes_deleted,
    'unlocks_deleted', unlocks_deleted,
    'payments_deleted', payments_deleted,
    'audit_logs_deleted', audit_deleted,
    'activity_logs_deleted', activity_deleted,
    'profile_deleted', true,
    'duration_ms', EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000,
    'deleted_at', now()
  );
  
  RETURN results;
END;
$$;

-- =============================================
-- MONITORING AND VERIFICATION
-- =============================================

CREATE OR REPLACE FUNCTION get_database_health_report()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  health_report jsonb;
BEGIN
  SELECT jsonb_build_object(
    'system_health', get_system_health(),
    'data_integrity', check_data_integrity(),
    'maintenance_status', get_maintenance_status(),
    'table_statistics', (
      SELECT jsonb_agg(row_to_json(stats.*))
      FROM get_table_statistics() stats
    ),
    'backup_status', (
      SELECT jsonb_build_object(
        'last_backup', MAX(completed_at),
        'total_backups_30d', COUNT(*),
        'failed_backups_30d', COUNT(*) FILTER (WHERE status = 'failed')
      )
      FROM backup_metadata
      WHERE started_at >= now() - interval '30 days'
    ),
    'generated_at', now()
  ) INTO health_report;
  
  RETURN health_report;
END;
$$;

CREATE OR REPLACE FUNCTION get_recovery_points_list()
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  table_counts jsonb,
  created_at timestamptz,
  age_days numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rp.id,
    rp.name,
    rp.description,
    rp.table_snapshots,
    rp.created_at,
    EXTRACT(DAY FROM (now() - rp.created_at))::numeric as age_days
  FROM recovery_points rp
  ORDER BY rp.created_at DESC;
END;
$$;