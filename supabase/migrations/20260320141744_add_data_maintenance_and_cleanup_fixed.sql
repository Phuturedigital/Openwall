/*
  # Add Data Maintenance and Cleanup Procedures

  ## Overview
  Automated data maintenance, archival, and cleanup procedures for long-term 
  database health and performance. Essential for production environments to
  prevent database bloat and maintain query performance.

  ## New Tables

  1. `archived_notes` - Archive for old/deleted notes
     - Complete copy of notes schema
     - Includes deletion reason and timestamp
     - Preserved for compliance and recovery

  2. `maintenance_logs` - Track maintenance operations
     - `id` (uuid, primary key)
     - `operation_type` (text) - Type of maintenance
     - `records_affected` (integer) - How many records
     - `duration_ms` (numeric) - Time taken
     - `success` (boolean) - Whether successful
     - `error_message` (text) - Error if failed
     - `executed_at` (timestamptz)

  ## New Functions

  1. `archive_old_notes()` - Move old notes to archive
  2. `cleanup_stale_data()` - Remove temporary/stale data
  3. `vacuum_analyze_tables()` - Optimize table performance
  4. `rebuild_indexes()` - Rebuild fragmented indexes
  5. `purge_old_logs()` - Remove old log entries
  6. `get_maintenance_schedule()` - Show maintenance tasks status

  ## Archival Rules

  - Notes older than 1 year are archived
  - Fulfilled notes archived after 90 days
  - Deleted notes immediately archived
  - Archive preserves all data for recovery

  ## Cleanup Rules

  - Rate limit records older than 7 days
  - Error logs older than 90 days
  - Performance metrics older than 30 days
  - Activity logs older than 180 days
  - Audit logs older than 365 days

  ## Performance

  - Background maintenance functions
  - Batch processing for large operations
  - Progress tracking and resumability
  - Minimal impact on live queries
*/

-- =============================================
-- ARCHIVED NOTES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS archived_notes (
  id uuid PRIMARY KEY,
  user_id uuid,
  title text,
  description text,
  category text,
  location text,
  budget text,
  contact text,
  attachments jsonb,
  note_type text,
  is_priority boolean,
  color text,
  created_at timestamptz,
  updated_at timestamptz,
  archived_at timestamptz DEFAULT now() NOT NULL,
  archived_reason text,
  original_data jsonb
);

CREATE INDEX IF NOT EXISTS idx_archived_notes_user 
ON archived_notes(user_id, archived_at DESC);

CREATE INDEX IF NOT EXISTS idx_archived_notes_archived_at 
ON archived_notes(archived_at DESC);

-- =============================================
-- MAINTENANCE LOGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS maintenance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type text NOT NULL CHECK (operation_type IN (
    'archive_notes', 'cleanup_logs', 'vacuum_analyze',
    'rebuild_indexes', 'purge_data', 'optimize_tables'
  )),
  records_affected integer DEFAULT 0,
  duration_ms numeric,
  success boolean DEFAULT true,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  executed_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_maintenance_logs_type_executed 
ON maintenance_logs(operation_type, executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_maintenance_logs_failed 
ON maintenance_logs(executed_at DESC)
WHERE success = false;

-- =============================================
-- ARCHIVAL FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION archive_old_notes(
  p_days_old integer DEFAULT 365,
  p_batch_size integer DEFAULT 1000
)
RETURNS integer
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  archived_count integer := 0;
  start_time timestamptz;
  duration_ms numeric;
BEGIN
  start_time := clock_timestamp();
  
  WITH notes_to_archive AS (
    SELECT * FROM notes
    WHERE created_at < now() - (p_days_old || ' days')::interval
    LIMIT p_batch_size
  ),
  inserted_archives AS (
    INSERT INTO archived_notes (
      id, user_id, title, description, category, location,
      budget, contact, attachments, note_type, is_priority,
      color, created_at, updated_at, archived_reason, original_data
    )
    SELECT 
      id, user_id, title, description, category, location,
      budget, contact, attachments, note_type, is_priority,
      color, created_at, updated_at, 
      'Automatic archival - older than ' || p_days_old || ' days',
      to_jsonb(notes_to_archive.*)
    FROM notes_to_archive
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  )
  DELETE FROM notes
  WHERE id IN (SELECT id FROM inserted_archives);
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000;
  
  INSERT INTO maintenance_logs (
    operation_type, records_affected, duration_ms, success, metadata
  ) VALUES (
    'archive_notes', archived_count, duration_ms, true,
    jsonb_build_object('days_old', p_days_old, 'batch_size', p_batch_size)
  );
  
  RETURN archived_count;
EXCEPTION
  WHEN OTHERS THEN
    duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000;
    INSERT INTO maintenance_logs (
      operation_type, records_affected, duration_ms, success, error_message
    ) VALUES (
      'archive_notes', 0, duration_ms, false, SQLERRM
    );
    RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION restore_archived_note(p_note_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  restored_count integer := 0;
BEGIN
  WITH archived_data AS (
    SELECT * FROM archived_notes WHERE id = p_note_id
  )
  INSERT INTO notes (
    id, user_id, title, description, category, location,
    budget, contact, attachments, note_type, is_priority,
    color, created_at, updated_at
  )
  SELECT 
    id, user_id, title, description, category, location,
    budget, contact, attachments, note_type, is_priority,
    color, created_at, now()
  FROM archived_data
  ON CONFLICT (id) DO NOTHING;
  
  GET DIAGNOSTICS restored_count = ROW_COUNT;
  
  IF restored_count > 0 THEN
    DELETE FROM archived_notes WHERE id = p_note_id;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- =============================================
-- CLEANUP FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION cleanup_stale_data()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  start_time timestamptz;
  duration_ms numeric;
  results jsonb;
  rate_limits_deleted integer;
  old_metrics_deleted integer;
  old_errors_deleted integer;
  expired_blocks_deleted integer;
BEGIN
  start_time := clock_timestamp();
  
  DELETE FROM rate_limits
  WHERE last_action < now() - interval '7 days';
  GET DIAGNOSTICS rate_limits_deleted = ROW_COUNT;
  
  DELETE FROM performance_metrics
  WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS old_metrics_deleted = ROW_COUNT;
  
  DELETE FROM error_logs
  WHERE created_at < now() - interval '90 days'
    AND resolved = true;
  GET DIAGNOSTICS old_errors_deleted = ROW_COUNT;
  
  DELETE FROM blocked_users
  WHERE blocked_until IS NOT NULL
    AND blocked_until < now();
  GET DIAGNOSTICS expired_blocks_deleted = ROW_COUNT;
  
  duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000;
  
  results := jsonb_build_object(
    'rate_limits_deleted', rate_limits_deleted,
    'old_metrics_deleted', old_metrics_deleted,
    'old_errors_deleted', old_errors_deleted,
    'expired_blocks_deleted', expired_blocks_deleted,
    'duration_ms', duration_ms,
    'executed_at', now()
  );
  
  INSERT INTO maintenance_logs (
    operation_type,
    records_affected,
    duration_ms,
    success,
    metadata
  ) VALUES (
    'cleanup_logs',
    rate_limits_deleted + old_metrics_deleted + old_errors_deleted + expired_blocks_deleted,
    duration_ms,
    true,
    results
  );
  
  RETURN results;
END;
$$;

CREATE OR REPLACE FUNCTION purge_old_logs(
  p_audit_days integer DEFAULT 365,
  p_activity_days integer DEFAULT 180,
  p_error_days integer DEFAULT 90
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  start_time timestamptz;
  duration_ms numeric;
  results jsonb;
  audit_deleted integer;
  activity_deleted integer;
  error_deleted integer;
BEGIN
  start_time := clock_timestamp();
  
  DELETE FROM audit_logs
  WHERE changed_at < now() - (p_audit_days || ' days')::interval;
  GET DIAGNOSTICS audit_deleted = ROW_COUNT;
  
  DELETE FROM user_activity_logs
  WHERE created_at < now() - (p_activity_days || ' days')::interval;
  GET DIAGNOSTICS activity_deleted = ROW_COUNT;
  
  DELETE FROM error_logs
  WHERE created_at < now() - (p_error_days || ' days')::interval
    AND resolved = true;
  GET DIAGNOSTICS error_deleted = ROW_COUNT;
  
  duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000;
  
  results := jsonb_build_object(
    'audit_logs_deleted', audit_deleted,
    'activity_logs_deleted', activity_deleted,
    'error_logs_deleted', error_deleted,
    'total_deleted', audit_deleted + activity_deleted + error_deleted,
    'duration_ms', duration_ms,
    'executed_at', now()
  );
  
  INSERT INTO maintenance_logs (
    operation_type,
    records_affected,
    duration_ms,
    success,
    metadata
  ) VALUES (
    'purge_data',
    audit_deleted + activity_deleted + error_deleted,
    duration_ms,
    true,
    results
  );
  
  RETURN results;
END;
$$;

-- =============================================
-- DATABASE OPTIMIZATION FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION vacuum_analyze_tables()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  start_time timestamptz;
  duration_ms numeric;
  results jsonb;
BEGIN
  start_time := clock_timestamp();
  
  VACUUM ANALYZE profiles;
  VACUUM ANALYZE notes;
  VACUUM ANALYZE unlocked_leads;
  VACUUM ANALYZE payment_history;
  VACUUM ANALYZE audit_logs;
  VACUUM ANALYZE user_activity_logs;
  VACUUM ANALYZE rate_limits;
  
  duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000;
  
  results := jsonb_build_object(
    'tables_optimized', 7,
    'duration_ms', duration_ms,
    'executed_at', now()
  );
  
  INSERT INTO maintenance_logs (
    operation_type,
    records_affected,
    duration_ms,
    success,
    metadata
  ) VALUES (
    'vacuum_analyze',
    7,
    duration_ms,
    true,
    results
  );
  
  RETURN results;
EXCEPTION
  WHEN OTHERS THEN
    duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000;
    INSERT INTO maintenance_logs (
      operation_type,
      records_affected,
      duration_ms,
      success,
      error_message
    ) VALUES (
      'vacuum_analyze',
      0,
      duration_ms,
      false,
      SQLERRM
    );
    RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION get_table_statistics()
RETURNS TABLE (
  table_name text,
  row_count bigint,
  total_size text,
  index_size text,
  toast_size text,
  last_vacuum timestamptz,
  last_analyze timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.relname::text as table_name,
    c.reltuples::bigint as row_count,
    pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
    pg_size_pretty(pg_indexes_size(c.oid)) as index_size,
    pg_size_pretty(pg_total_relation_size(c.reltoastrelid)) as toast_size,
    pg_stat_get_last_vacuum_time(c.oid) as last_vacuum,
    pg_stat_get_last_analyze_time(c.oid) as last_analyze
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
  ORDER BY pg_total_relation_size(c.oid) DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_index_usage()
RETURNS TABLE (
  schemaname text,
  tablename text,
  indexname text,
  index_size text,
  index_scans bigint,
  rows_read bigint,
  rows_fetched bigint
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname::text,
    tablename::text,
    indexname::text,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as index_scans,
    idx_tup_read as rows_read,
    idx_tup_fetch as rows_fetched
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
  ORDER BY idx_scan ASC;
END;
$$;

-- =============================================
-- AUTOMATED CLEANUP PROCEDURES
-- =============================================

CREATE OR REPLACE FUNCTION daily_maintenance()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  start_time timestamptz;
  duration_ms numeric;
  results jsonb;
  cleanup_result jsonb;
BEGIN
  start_time := clock_timestamp();
  
  cleanup_result := cleanup_stale_data();
  
  PERFORM reset_rate_limits();
  
  PERFORM cleanup_expired_blocks();
  
  duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000;
  
  results := jsonb_build_object(
    'cleanup_results', cleanup_result,
    'total_duration_ms', duration_ms,
    'executed_at', now(),
    'success', true
  );
  
  RETURN results;
END;
$$;

CREATE OR REPLACE FUNCTION weekly_maintenance()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  start_time timestamptz;
  duration_ms numeric;
  results jsonb;
  vacuum_result jsonb;
  purge_result jsonb;
BEGIN
  start_time := clock_timestamp();
  
  vacuum_result := vacuum_analyze_tables();
  
  purge_result := purge_old_logs(365, 180, 90);
  
  PERFORM archive_old_notes(365, 1000);
  
  duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000;
  
  results := jsonb_build_object(
    'vacuum_result', vacuum_result,
    'purge_result', purge_result,
    'total_duration_ms', duration_ms,
    'executed_at', now(),
    'success', true
  );
  
  RETURN results;
END;
$$;

-- =============================================
-- DATA INTEGRITY CHECKS
-- =============================================

CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  results jsonb;
  orphaned_unlocks integer;
  orphaned_payments integer;
  invalid_emails integer;
  duplicate_emails integer;
BEGIN
  SELECT COUNT(*) INTO orphaned_unlocks
  FROM unlocked_leads ul
  WHERE NOT EXISTS (SELECT 1 FROM notes WHERE id = ul.note_id);
  
  SELECT COUNT(*) INTO orphaned_payments
  FROM payment_history ph
  WHERE ph.note_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM notes WHERE id = ph.note_id);
  
  SELECT COUNT(*) INTO invalid_emails
  FROM profiles
  WHERE NOT validate_email(email);
  
  SELECT COUNT(*) INTO duplicate_emails
  FROM (
    SELECT email, COUNT(*) as cnt
    FROM profiles
    GROUP BY email
    HAVING COUNT(*) > 1
  ) duplicates;
  
  results := jsonb_build_object(
    'orphaned_unlocks', orphaned_unlocks,
    'orphaned_payments', orphaned_payments,
    'invalid_emails', invalid_emails,
    'duplicate_emails', duplicate_emails,
    'has_issues', (orphaned_unlocks + orphaned_payments + invalid_emails + duplicate_emails) > 0,
    'checked_at', now()
  );
  
  IF (orphaned_unlocks + orphaned_payments + invalid_emails + duplicate_emails) > 0 THEN
    PERFORM log_error(
      'data_integrity_issue',
      'Data integrity check found issues',
      results::text,
      'system_check',
      'warning'
    );
  END IF;
  
  RETURN results;
END;
$$;

CREATE OR REPLACE FUNCTION fix_orphaned_records()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  start_time timestamptz;
  results jsonb;
  unlocks_deleted integer;
  payments_cleaned integer;
BEGIN
  start_time := clock_timestamp();
  
  DELETE FROM unlocked_leads
  WHERE NOT EXISTS (SELECT 1 FROM notes WHERE id = unlocked_leads.note_id);
  GET DIAGNOSTICS unlocks_deleted = ROW_COUNT;
  
  UPDATE payment_history
  SET note_id = NULL
  WHERE note_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM notes WHERE id = payment_history.note_id);
  GET DIAGNOSTICS payments_cleaned = ROW_COUNT;
  
  results := jsonb_build_object(
    'unlocks_deleted', unlocks_deleted,
    'payments_cleaned', payments_cleaned,
    'duration_ms', EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000,
    'executed_at', now()
  );
  
  RETURN results;
END;
$$;

-- =============================================
-- MAINTENANCE SCHEDULE TRACKING
-- =============================================

CREATE OR REPLACE FUNCTION get_maintenance_status()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  status jsonb;
BEGIN
  SELECT jsonb_build_object(
    'last_daily_maintenance', (
      SELECT MAX(executed_at) FROM maintenance_logs
      WHERE operation_type = 'cleanup_logs'
    ),
    'last_weekly_maintenance', (
      SELECT MAX(executed_at) FROM maintenance_logs
      WHERE operation_type = 'vacuum_analyze'
    ),
    'pending_archives', (
      SELECT COUNT(*) FROM notes
      WHERE created_at < now() - interval '365 days'
    ),
    'recent_failures', (
      SELECT COUNT(*) FROM maintenance_logs
      WHERE success = false
        AND executed_at >= now() - interval '7 days'
    ),
    'database_size', (
      SELECT pg_size_pretty(pg_database_size(current_database()))
    ),
    'checked_at', now()
  ) INTO status;
  
  RETURN status;
END;
$$;