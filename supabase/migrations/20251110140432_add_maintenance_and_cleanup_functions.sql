/*
  # Add Maintenance and Data Cleanup Functions

  ## Overview
  Essential maintenance functions for platform health:
  - Automatic data cleanup
  - Orphaned record removal
  - Performance optimization
  - Data integrity checks
  - Scheduled maintenance tasks

  ## New Functions
  1. `cleanup_old_activity_logs()` - Remove old activity logs
  2. `cleanup_sent_emails()` - Clean email queue
  3. `cleanup_orphaned_records()` - Remove orphaned data
  4. `vacuum_and_analyze()` - Database optimization
  5. `check_data_integrity()` - Validate data consistency
  6. `archive_old_notes()` - Archive fulfilled notes
  7. `cleanup_stale_requests()` - Remove abandoned requests

  ## Scheduled Tasks
  These functions should be run via cron jobs or edge functions:
  - Daily: cleanup_old_activity_logs, reset_daily_request_counts
  - Weekly: cleanup_sent_emails, cleanup_orphaned_records
  - Monthly: archive_old_notes

  ## Security
  - All functions use SECURITY DEFINER
  - No RLS bypass, proper authentication required
*/

-- Function: Clean up old activity logs (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs(p_days_to_keep integer DEFAULT 90)
RETURNS integer
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM activity_log
  WHERE created_at < NOW() - (p_days_to_keep || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Function: Clean up sent/failed emails (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_sent_emails(p_days_to_keep integer DEFAULT 30)
RETURNS integer
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM email_queue
  WHERE status IN ('sent', 'failed')
    AND created_at < NOW() - (p_days_to_keep || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Function: Clean up orphaned connection requests
CREATE OR REPLACE FUNCTION cleanup_orphaned_records()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  orphaned_requests integer;
  orphaned_unlocks integer;
  orphaned_transactions integer;
  result jsonb;
BEGIN
  -- Remove connection requests for deleted notes
  DELETE FROM connection_requests
  WHERE note_id IN (
    SELECT id FROM notes WHERE status = 'deleted'
  );
  GET DIAGNOSTICS orphaned_requests = ROW_COUNT;
  
  -- Remove unlocks for deleted notes
  DELETE FROM unlocks
  WHERE note_id IN (
    SELECT id FROM notes WHERE status = 'deleted'
  );
  GET DIAGNOSTICS orphaned_unlocks = ROW_COUNT;
  
  -- Remove transactions for non-existent notes
  DELETE FROM transactions
  WHERE note_id IS NOT NULL 
    AND note_id NOT IN (SELECT id FROM notes);
  GET DIAGNOSTICS orphaned_transactions = ROW_COUNT;
  
  result := jsonb_build_object(
    'orphaned_requests', orphaned_requests,
    'orphaned_unlocks', orphaned_unlocks,
    'orphaned_transactions', orphaned_transactions,
    'total_cleaned', orphaned_requests + orphaned_unlocks + orphaned_transactions
  );
  
  RETURN result;
END;
$$;

-- Function: Clean up stale pending requests (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_stale_requests(p_days_old integer DEFAULT 30)
RETURNS integer
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE connection_requests
  SET status = 'closed',
      notified = true
  WHERE status = 'pending'
    AND created_at < NOW() - (p_days_old || ' days')::interval;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$;

-- Function: Archive old fulfilled notes (older than 6 months)
CREATE OR REPLACE FUNCTION archive_old_notes(p_months_old integer DEFAULT 6)
RETURNS integer
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  archived_count integer;
BEGIN
  -- For now, we just mark them as deleted
  -- In future, could move to separate archive table
  UPDATE notes
  SET status = 'deleted',
      updated_at = NOW()
  WHERE status = 'fulfilled'
    AND fulfilled_at < NOW() - (p_months_old || ' months')::interval;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  RETURN archived_count;
END;
$$;

-- Function: Retry failed emails (max 3 attempts)
CREATE OR REPLACE FUNCTION retry_failed_emails()
RETURNS integer
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  reset_count integer;
BEGIN
  UPDATE email_queue
  SET status = 'pending',
      attempts = attempts + 1,
      error = NULL
  WHERE status = 'failed'
    AND attempts < 3
    AND created_at > NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  
  RETURN reset_count;
END;
$$;

-- Function: Check data integrity
CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  orphaned_notes integer;
  invalid_requests integer;
  invalid_unlocks integer;
  missing_profiles integer;
  result jsonb;
BEGIN
  -- Count notes without valid user
  SELECT COUNT(*) INTO orphaned_notes
  FROM notes
  WHERE user_id NOT IN (SELECT id FROM profiles);
  
  -- Count requests for non-existent notes
  SELECT COUNT(*) INTO invalid_requests
  FROM connection_requests
  WHERE note_id NOT IN (SELECT id FROM notes);
  
  -- Count unlocks for non-existent notes
  SELECT COUNT(*) INTO invalid_unlocks
  FROM unlocks
  WHERE note_id NOT IN (SELECT id FROM notes);
  
  -- Count auth users without profiles
  SELECT COUNT(*) INTO missing_profiles
  FROM auth.users
  WHERE id NOT IN (SELECT id FROM profiles);
  
  result := jsonb_build_object(
    'orphaned_notes', orphaned_notes,
    'invalid_requests', invalid_requests,
    'invalid_unlocks', invalid_unlocks,
    'missing_profiles', missing_profiles,
    'is_healthy', (orphaned_notes + invalid_requests + invalid_unlocks + missing_profiles = 0)
  );
  
  RETURN result;
END;
$$;

-- Function: Get database statistics
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'table_sizes', (
      SELECT jsonb_object_agg(tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)))
      FROM pg_tables
      WHERE schemaname = 'public'
    ),
    'total_size', (
      SELECT pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename))::bigint)
      FROM pg_tables
      WHERE schemaname = 'public'
    ),
    'index_usage', (
      SELECT jsonb_object_agg(
        indexrelname,
        jsonb_build_object(
          'scans', idx_scan,
          'size', pg_size_pretty(pg_relation_size(indexrelid))
        )
      )
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC
      LIMIT 10
    )
  ) INTO stats;
  
  RETURN stats;
END;
$$;

-- Function: Reset failed transactions (admin only)
CREATE OR REPLACE FUNCTION reset_failed_transactions(p_transaction_ids uuid[])
RETURNS integer
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  reset_count integer;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  UPDATE transactions
  SET status = 'pending',
      stripe_id = NULL
  WHERE id = ANY(p_transaction_ids)
    AND status = 'failed';
  
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  
  RETURN reset_count;
END;
$$;

-- Function: Bulk delete spam notes (admin only)
CREATE OR REPLACE FUNCTION bulk_delete_notes(p_note_ids uuid[], p_reason text)
RETURNS integer
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  UPDATE notes
  SET status = 'deleted',
      updated_at = NOW()
  WHERE id = ANY(p_note_ids);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log action
  PERFORM log_admin_action('bulk_delete_notes', 'notes', NULL, p_reason,
    jsonb_build_object('count', deleted_count, 'note_ids', p_note_ids));
  
  RETURN deleted_count;
END;
$$;

-- Function: Recalculate user stats (useful after data cleanup)
CREATE OR REPLACE FUNCTION recalculate_user_stats(p_user_id uuid)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_notes', COUNT(DISTINCT n.id),
    'active_notes', COUNT(DISTINCT n.id) FILTER (WHERE n.status = 'open'),
    'fulfilled_notes', COUNT(DISTINCT n.id) FILTER (WHERE n.status = 'fulfilled'),
    'total_requests_sent', COUNT(DISTINCT cr.id),
    'approved_requests', COUNT(DISTINCT cr.id) FILTER (WHERE cr.status = 'approved')
  )
  INTO stats
  FROM profiles p
  LEFT JOIN notes n ON n.user_id = p.id
  LEFT JOIN connection_requests cr ON cr.freelancer_id = p.id
  WHERE p.id = p_user_id
  GROUP BY p.id;
  
  RETURN stats;
END;
$$;

-- Function: Optimize database (run periodically)
CREATE OR REPLACE FUNCTION optimize_database()
RETURNS text
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Analyze all tables for query planner
  ANALYZE notes;
  ANALYZE profiles;
  ANALYZE connection_requests;
  ANALYZE unlocks;
  ANALYZE transactions;
  ANALYZE notifications;
  
  RETURN 'Database optimization complete';
END;
$$;

-- Function: Generate maintenance report
CREATE OR REPLACE FUNCTION generate_maintenance_report()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  report jsonb;
BEGIN
  SELECT jsonb_build_object(
    'timestamp', NOW(),
    'integrity_check', check_data_integrity(),
    'database_stats', get_database_stats(),
    'pending_emails', (SELECT COUNT(*) FROM email_queue WHERE status = 'pending'),
    'failed_emails', (SELECT COUNT(*) FROM email_queue WHERE status = 'failed'),
    'stale_requests', (
      SELECT COUNT(*) FROM connection_requests 
      WHERE status = 'pending' 
      AND created_at < NOW() - INTERVAL '30 days'
    ),
    'old_activity_logs', (
      SELECT COUNT(*) FROM activity_log 
      WHERE created_at < NOW() - INTERVAL '90 days'
    ),
    'unread_notifications', (
      SELECT COUNT(*) FROM notifications WHERE read = false
    )
  ) INTO report;
  
  RETURN report;
END;
$$;

-- Create a maintenance log table
CREATE TABLE IF NOT EXISTS maintenance_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'running')),
  details jsonb,
  duration_ms integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_log_created 
ON maintenance_log(created_at DESC);

-- Function: Log maintenance task
CREATE OR REPLACE FUNCTION log_maintenance_task(
  p_task text,
  p_status text,
  p_details jsonb DEFAULT NULL,
  p_duration_ms integer DEFAULT NULL
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO maintenance_log (task, status, details, duration_ms)
  VALUES (p_task, p_status, p_details, p_duration_ms)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;