/*
  # Add Monitoring and Health Check System

  ## Overview
  Comprehensive monitoring and observability system for production operations.
  Provides real-time insights into system health, performance, and usage patterns.

  ## New Tables

  1. `system_metrics` - Track key performance indicators
     - `id` (uuid, primary key)
     - `metric_name` (text) - Name of metric
     - `metric_value` (numeric) - Value
     - `metric_unit` (text) - Unit of measurement
     - `tags` (jsonb) - Additional metadata
     - `recorded_at` (timestamptz) - When recorded

  2. `error_logs` - Application error tracking
     - `id` (uuid, primary key)
     - `error_type` (text) - Error category
     - `error_message` (text) - Error details
     - `stack_trace` (text) - Stack trace
     - `user_id` (uuid) - User who encountered error
     - `request_path` (text) - Where error occurred
     - `severity` (text) - critical, error, warning
     - `resolved` (boolean) - Whether fixed
     - `created_at` (timestamptz)

  3. `performance_metrics` - Query and endpoint performance
     - `id` (uuid, primary key)
     - `operation_name` (text) - Query/operation name
     - `duration_ms` (numeric) - Time taken
     - `success` (boolean) - Whether successful
     - `user_id` (uuid) - User who triggered
     - `metadata` (jsonb) - Additional context
     - `created_at` (timestamptz)

  ## New Functions

  1. `record_metric()` - Record a system metric
  2. `log_error()` - Log application errors
  3. `record_performance()` - Track operation performance
  4. `get_system_health()` - Overall system health report
  5. `get_database_stats()` - Database statistics
  6. `get_user_stats()` - User engagement metrics
  7. `get_platform_stats()` - Platform-wide statistics

  ## Monitoring Views

  1. `v_active_users` - Currently active users
  2. `v_popular_locations` - Most active locations
  3. `v_platform_overview` - Key platform metrics
  4. `v_revenue_metrics` - Revenue and payment metrics

  ## Performance

  - Time-series optimized indexes
  - Automatic metric aggregation
  - Efficient rollup queries
*/

-- =============================================
-- SYSTEM METRICS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_unit text,
  tags jsonb DEFAULT '{}'::jsonb,
  recorded_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_name_time 
ON system_metrics(metric_name, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_metrics_time 
ON system_metrics(recorded_at DESC);

-- =============================================
-- ERROR LOGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type text NOT NULL,
  error_message text NOT NULL,
  stack_trace text,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  request_path text,
  severity text DEFAULT 'error' CHECK (severity IN ('critical', 'error', 'warning')),
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_error_logs_severity_created 
ON error_logs(severity, created_at DESC)
WHERE resolved = false;

CREATE INDEX IF NOT EXISTS idx_error_logs_user 
ON error_logs(user_id, created_at DESC)
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_error_logs_type 
ON error_logs(error_type, created_at DESC);

-- =============================================
-- PERFORMANCE METRICS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_name text NOT NULL,
  duration_ms numeric NOT NULL,
  success boolean DEFAULT true,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_perf_metrics_operation_time 
ON performance_metrics(operation_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_perf_metrics_slow_queries 
ON performance_metrics(duration_ms DESC, created_at DESC)
WHERE duration_ms > 1000;

-- =============================================
-- MONITORING FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION record_metric(
  p_metric_name text,
  p_metric_value numeric,
  p_metric_unit text DEFAULT NULL,
  p_tags jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  metric_id uuid;
BEGIN
  INSERT INTO system_metrics (metric_name, metric_value, metric_unit, tags)
  VALUES (p_metric_name, p_metric_value, p_metric_unit, p_tags)
  RETURNING id INTO metric_id;
  
  RETURN metric_id;
END;
$$;

CREATE OR REPLACE FUNCTION log_error(
  p_error_type text,
  p_error_message text,
  p_stack_trace text DEFAULT NULL,
  p_request_path text DEFAULT NULL,
  p_severity text DEFAULT 'error'
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  error_id uuid;
BEGIN
  INSERT INTO error_logs (
    error_type, 
    error_message, 
    stack_trace, 
    user_id, 
    request_path, 
    severity
  )
  VALUES (
    p_error_type,
    p_error_message,
    p_stack_trace,
    auth.uid(),
    p_request_path,
    p_severity
  )
  RETURNING id INTO error_id;
  
  IF p_severity = 'critical' THEN
    PERFORM record_metric('critical_errors', 1, 'count', 
      jsonb_build_object('error_type', p_error_type)
    );
  END IF;
  
  RETURN error_id;
END;
$$;

CREATE OR REPLACE FUNCTION record_performance(
  p_operation_name text,
  p_duration_ms numeric,
  p_success boolean DEFAULT true,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  perf_id uuid;
BEGIN
  INSERT INTO performance_metrics (
    operation_name,
    duration_ms,
    success,
    user_id,
    metadata
  )
  VALUES (
    p_operation_name,
    p_duration_ms,
    p_success,
    auth.uid(),
    p_metadata
  )
  RETURNING id INTO perf_id;
  
  IF p_duration_ms > 5000 THEN
    PERFORM flag_suspicious_activity(
      auth.uid(),
      'suspicious_pattern',
      'low',
      jsonb_build_object(
        'reason', 'slow_operation',
        'operation', p_operation_name,
        'duration_ms', p_duration_ms
      )
    );
  END IF;
  
  RETURN perf_id;
END;
$$;

-- =============================================
-- SYSTEM HEALTH FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION get_system_health()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  health_data jsonb;
  total_users integer;
  active_users_24h integer;
  total_notes integer;
  notes_today integer;
  total_unlocks integer;
  unlocks_today integer;
  error_count_24h integer;
  critical_errors_24h integer;
BEGIN
  SELECT COUNT(*) INTO total_users FROM profiles;
  
  SELECT COUNT(DISTINCT user_id) INTO active_users_24h
  FROM user_activity_logs
  WHERE created_at >= now() - interval '24 hours';
  
  SELECT COUNT(*) INTO total_notes FROM notes;
  
  SELECT COUNT(*) INTO notes_today
  FROM notes
  WHERE created_at >= CURRENT_DATE;
  
  SELECT COUNT(*) INTO total_unlocks FROM unlocked_leads;
  
  SELECT COUNT(*) INTO unlocks_today
  FROM unlocked_leads
  WHERE unlocked_at >= CURRENT_DATE;
  
  SELECT COUNT(*) INTO error_count_24h
  FROM error_logs
  WHERE created_at >= now() - interval '24 hours';
  
  SELECT COUNT(*) INTO critical_errors_24h
  FROM error_logs
  WHERE created_at >= now() - interval '24 hours'
    AND severity = 'critical';
  
  health_data := jsonb_build_object(
    'status', CASE 
      WHEN critical_errors_24h > 10 THEN 'critical'
      WHEN error_count_24h > 100 THEN 'degraded'
      ELSE 'healthy'
    END,
    'timestamp', now(),
    'users', jsonb_build_object(
      'total', total_users,
      'active_24h', active_users_24h
    ),
    'notes', jsonb_build_object(
      'total', total_notes,
      'today', notes_today
    ),
    'unlocks', jsonb_build_object(
      'total', total_unlocks,
      'today', unlocks_today
    ),
    'errors', jsonb_build_object(
      'last_24h', error_count_24h,
      'critical_24h', critical_errors_24h
    )
  );
  
  RETURN health_data;
END;
$$;

CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  stats jsonb;
  db_size text;
  table_sizes jsonb;
BEGIN
  SELECT pg_size_pretty(pg_database_size(current_database())) INTO db_size;
  
  SELECT jsonb_object_agg(
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
  ) INTO table_sizes
  FROM pg_tables
  WHERE schemaname = 'public';
  
  stats := jsonb_build_object(
    'database_size', db_size,
    'table_sizes', table_sizes,
    'timestamp', now()
  );
  
  RETURN stats;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_stats(p_days integer DEFAULT 7)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'period_days', p_days,
    'new_signups', (
      SELECT COUNT(*) FROM profiles
      WHERE created_at >= now() - (p_days || ' days')::interval
    ),
    'active_users', (
      SELECT COUNT(DISTINCT user_id) FROM user_activity_logs
      WHERE created_at >= now() - (p_days || ' days')::interval
    ),
    'by_user_type', (
      SELECT jsonb_object_agg(user_type, count)
      FROM (
        SELECT user_type, COUNT(*) as count
        FROM profiles
        GROUP BY user_type
      ) sub
    ),
    'timestamp', now()
  ) INTO stats;
  
  RETURN stats;
END;
$$;

CREATE OR REPLACE FUNCTION get_platform_stats(p_days integer DEFAULT 7)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'period_days', p_days,
    'notes_created', (
      SELECT COUNT(*) FROM notes
      WHERE created_at >= now() - (p_days || ' days')::interval
    ),
    'leads_unlocked', (
      SELECT COUNT(*) FROM unlocked_leads
      WHERE unlocked_at >= now() - (p_days || ' days')::interval
    ),
    'total_revenue', (
      SELECT COALESCE(SUM(payment_amount), 0) FROM unlocked_leads
      WHERE unlocked_at >= now() - (p_days || ' days')::interval
    ),
    'payments_completed', (
      SELECT COUNT(*) FROM payment_history
      WHERE status = 'completed'
        AND created_at >= now() - (p_days || ' days')::interval
    ),
    'avg_payment', (
      SELECT COALESCE(AVG(amount), 0) FROM payment_history
      WHERE status = 'completed'
        AND created_at >= now() - (p_days || ' days')::interval
    ),
    'top_locations', (
      SELECT jsonb_agg(location_data)
      FROM (
        SELECT jsonb_build_object(
          'location', location,
          'note_count', COUNT(*)
        ) as location_data
        FROM notes
        WHERE location IS NOT NULL
          AND created_at >= now() - (p_days || ' days')::interval
        GROUP BY location
        ORDER BY COUNT(*) DESC
        LIMIT 10
      ) sub
    ),
    'timestamp', now()
  ) INTO stats;
  
  RETURN stats;
END;
$$;

-- =============================================
-- MONITORING VIEWS
-- =============================================

CREATE OR REPLACE VIEW v_active_users AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.user_type,
  COUNT(DISTINCT ual.id) as actions_24h,
  MAX(ual.created_at) as last_activity
FROM profiles p
LEFT JOIN user_activity_logs ual ON ual.user_id = p.id
  AND ual.created_at >= now() - interval '24 hours'
GROUP BY p.id, p.email, p.full_name, p.user_type
HAVING COUNT(DISTINCT ual.id) > 0
ORDER BY last_activity DESC;

CREATE OR REPLACE VIEW v_popular_locations AS
SELECT 
  location,
  COUNT(*) as note_count,
  COUNT(DISTINCT user_id) as unique_posters,
  MAX(created_at) as last_post
FROM notes
WHERE location IS NOT NULL
  AND created_at >= now() - interval '30 days'
GROUP BY location
ORDER BY note_count DESC;

CREATE OR REPLACE VIEW v_platform_overview AS
SELECT 
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM profiles WHERE user_type = 'client') as total_clients,
  (SELECT COUNT(*) FROM profiles WHERE user_type = 'vendor') as total_vendors,
  (SELECT COUNT(*) FROM notes) as total_notes,
  (SELECT COUNT(*) FROM notes WHERE created_at >= CURRENT_DATE) as notes_today,
  (SELECT COUNT(*) FROM unlocked_leads) as total_unlocks,
  (SELECT COUNT(*) FROM unlocked_leads WHERE unlocked_at >= CURRENT_DATE) as unlocks_today,
  (SELECT COALESCE(SUM(payment_amount), 0) FROM unlocked_leads) as total_revenue,
  (SELECT COALESCE(SUM(payment_amount), 0) FROM unlocked_leads WHERE unlocked_at >= CURRENT_DATE) as revenue_today,
  (SELECT COUNT(DISTINCT user_id) FROM user_activity_logs WHERE created_at >= now() - interval '24 hours') as active_users_24h,
  (SELECT COUNT(*) FROM error_logs WHERE created_at >= now() - interval '24 hours' AND resolved = false) as unresolved_errors_24h;

CREATE OR REPLACE VIEW v_revenue_metrics AS
SELECT 
  DATE(unlocked_at) as date,
  COUNT(*) as unlock_count,
  SUM(payment_amount) as revenue,
  AVG(payment_amount) as avg_transaction,
  COUNT(DISTINCT vendor_id) as unique_vendors
FROM unlocked_leads
WHERE unlocked_at >= CURRENT_DATE - interval '30 days'
GROUP BY DATE(unlocked_at)
ORDER BY date DESC;

-- =============================================
-- PERFORMANCE MONITORING
-- =============================================

CREATE OR REPLACE FUNCTION get_slow_queries(p_threshold_ms numeric DEFAULT 1000)
RETURNS TABLE (
  operation_name text,
  avg_duration_ms numeric,
  max_duration_ms numeric,
  occurrence_count bigint,
  last_occurrence timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.operation_name,
    AVG(pm.duration_ms) as avg_duration_ms,
    MAX(pm.duration_ms) as max_duration_ms,
    COUNT(*) as occurrence_count,
    MAX(pm.created_at) as last_occurrence
  FROM performance_metrics pm
  WHERE pm.duration_ms >= p_threshold_ms
    AND pm.created_at >= now() - interval '24 hours'
  GROUP BY pm.operation_name
  ORDER BY avg_duration_ms DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_error_summary(p_hours integer DEFAULT 24)
RETURNS TABLE (
  error_type text,
  severity text,
  occurrence_count bigint,
  last_occurrence timestamptz,
  resolved_count bigint
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    el.error_type,
    el.severity,
    COUNT(*) as occurrence_count,
    MAX(el.created_at) as last_occurrence,
    COUNT(*) FILTER (WHERE el.resolved = true) as resolved_count
  FROM error_logs el
  WHERE el.created_at >= now() - (p_hours || ' hours')::interval
  GROUP BY el.error_type, el.severity
  ORDER BY 
    CASE el.severity
      WHEN 'critical' THEN 1
      WHEN 'error' THEN 2
      WHEN 'warning' THEN 3
    END,
    occurrence_count DESC;
END;
$$;

-- =============================================
-- AUTOMATED METRIC RECORDING
-- =============================================

CREATE OR REPLACE FUNCTION record_note_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM record_metric('notes_created', 1, 'count', 
    jsonb_build_object('note_type', NEW.note_type)
  );
  
  IF NEW.budget IS NOT NULL THEN
    PERFORM record_metric('note_budget', NEW.budget, 'currency',
      jsonb_build_object('note_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS record_note_metrics_trigger ON notes;
CREATE TRIGGER record_note_metrics_trigger
  AFTER INSERT ON notes
  FOR EACH ROW
  EXECUTE FUNCTION record_note_metrics();

CREATE OR REPLACE FUNCTION record_unlock_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM record_metric('leads_unlocked', 1, 'count',
    jsonb_build_object('vendor_id', NEW.vendor_id)
  );
  
  PERFORM record_metric('unlock_revenue', NEW.payment_amount, 'currency',
    jsonb_build_object('note_id', NEW.note_id)
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS record_unlock_metrics_trigger ON unlocked_leads;
CREATE TRIGGER record_unlock_metrics_trigger
  AFTER INSERT ON unlocked_leads
  FOR EACH ROW
  EXECUTE FUNCTION record_unlock_metrics();

CREATE OR REPLACE FUNCTION record_payment_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM record_metric('payments_completed', 1, 'count',
      jsonb_build_object('user_id', NEW.user_id, 'amount', NEW.amount)
    );
    
    PERFORM record_metric('payment_amount', NEW.amount, 'currency',
      jsonb_build_object('payment_id', NEW.id)
    );
  ELSIF NEW.status = 'failed' AND (OLD.status IS NULL OR OLD.status != 'failed') THEN
    PERFORM record_metric('payments_failed', 1, 'count',
      jsonb_build_object('user_id', NEW.user_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS record_payment_metrics_trigger ON payment_history;
CREATE TRIGGER record_payment_metrics_trigger
  AFTER INSERT OR UPDATE ON payment_history
  FOR EACH ROW
  EXECUTE FUNCTION record_payment_metrics();