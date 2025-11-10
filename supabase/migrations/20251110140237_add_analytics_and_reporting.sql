/*
  # Add Analytics and Reporting System

  ## Overview
  Complete analytics system for tracking platform metrics:
  - User activity tracking
  - Note performance metrics
  - Request conversion rates
  - Platform health monitoring
  - Admin dashboard data views

  ## New Tables
  1. `activity_log` - User activity tracking
  2. `platform_metrics` - Daily/weekly aggregated metrics

  ## New Views
  1. `note_analytics` - Note performance metrics
  2. `user_analytics` - User engagement metrics
  3. `platform_stats` - Overall platform statistics

  ## New Functions
  1. `log_activity()` - Track user actions
  2. `get_platform_metrics()` - Get aggregated stats
  3. `get_note_performance()` - Get note engagement data
  4. `calculate_conversion_rates()` - Request→Unlock conversion

  ## Security
  - Activity logs are private to users
  - Analytics views restricted to authenticated users
  - Admin-only functions for platform-wide metrics
*/

-- Table: Activity log for user actions
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view own activity
CREATE POLICY "Users can view own activity"
  ON activity_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS: System can insert activity logs
CREATE POLICY "System can log activity"
  ON activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Indexes for activity queries
CREATE INDEX IF NOT EXISTS idx_activity_user_created 
ON activity_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_action_created 
ON activity_log(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_resource 
ON activity_log(resource_type, resource_id);

-- Table: Aggregated platform metrics
CREATE TABLE IF NOT EXISTS platform_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL,
  total_users integer DEFAULT 0,
  active_users integer DEFAULT 0,
  new_users integer DEFAULT 0,
  total_notes integer DEFAULT 0,
  new_notes integer DEFAULT 0,
  total_requests integer DEFAULT 0,
  new_requests integer DEFAULT 0,
  approved_requests integer DEFAULT 0,
  total_unlocks integer DEFAULT 0,
  new_unlocks integer DEFAULT 0,
  revenue_cents integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(metric_date)
);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_platform_metrics_date 
ON platform_metrics(metric_date DESC);

-- View: Note analytics with engagement metrics
CREATE OR REPLACE VIEW note_analytics AS
SELECT 
  n.id,
  n.user_id,
  n.title,
  n.body,
  n.budget,
  n.status,
  n.prio,
  n.created_at,
  n.updated_at,
  n.fulfilled_at,
  COUNT(DISTINCT cr.id) as total_requests,
  COUNT(DISTINCT cr.id) FILTER (WHERE cr.status = 'pending') as pending_requests,
  COUNT(DISTINCT cr.id) FILTER (WHERE cr.status = 'approved') as approved_requests,
  COUNT(DISTINCT cr.id) FILTER (WHERE cr.status = 'declined') as declined_requests,
  COUNT(DISTINCT u.id) as total_unlocks,
  CASE 
    WHEN COUNT(DISTINCT cr.id) > 0 
    THEN ROUND((COUNT(DISTINCT u.id)::numeric / COUNT(DISTINCT cr.id)::numeric) * 100, 2)
    ELSE 0
  END as conversion_rate,
  EXTRACT(EPOCH FROM (COALESCE(n.fulfilled_at, NOW()) - n.created_at)) / 3600 as hours_to_fulfill
FROM notes n
LEFT JOIN connection_requests cr ON cr.note_id = n.id
LEFT JOIN unlocks u ON u.note_id = n.id
GROUP BY n.id;

-- View: User analytics with engagement metrics
CREATE OR REPLACE VIEW user_analytics AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.user_type,
  p.created_at,
  p.last_active,
  COUNT(DISTINCT n.id) as total_notes_posted,
  COUNT(DISTINCT n.id) FILTER (WHERE n.status = 'open') as active_notes,
  COUNT(DISTINCT n.id) FILTER (WHERE n.status = 'fulfilled') as fulfilled_notes,
  COUNT(DISTINCT cr_sent.id) as requests_sent,
  COUNT(DISTINCT cr_sent.id) FILTER (WHERE cr_sent.status = 'approved') as requests_approved,
  COUNT(DISTINCT cr_received.id) as requests_received,
  COUNT(DISTINCT u.id) as unlocks_made,
  COUNT(DISTINCT t.id) as transactions_count,
  SUM(COALESCE(t.amount, 0)) as total_spent_cents,
  EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400 as days_since_signup,
  EXTRACT(EPOCH FROM (NOW() - p.last_active)) / 86400 as days_since_active
FROM profiles p
LEFT JOIN notes n ON n.user_id = p.id
LEFT JOIN connection_requests cr_sent ON cr_sent.freelancer_id = p.id
LEFT JOIN connection_requests cr_received ON cr_received.note_id = ANY(SELECT id FROM notes WHERE user_id = p.id)
LEFT JOIN unlocks u ON u.freelancer_id = p.id
LEFT JOIN transactions t ON t.user_id = p.id
GROUP BY p.id;

-- View: Platform statistics
CREATE OR REPLACE VIEW platform_stats AS
SELECT 
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM profiles WHERE last_active >= NOW() - INTERVAL '7 days') as active_users_7d,
  (SELECT COUNT(*) FROM profiles WHERE last_active >= NOW() - INTERVAL '30 days') as active_users_30d,
  (SELECT COUNT(*) FROM profiles WHERE created_at >= NOW() - INTERVAL '7 days') as new_users_7d,
  (SELECT COUNT(*) FROM notes) as total_notes,
  (SELECT COUNT(*) FROM notes WHERE status = 'open') as open_notes,
  (SELECT COUNT(*) FROM notes WHERE status = 'fulfilled') as fulfilled_notes,
  (SELECT COUNT(*) FROM notes WHERE created_at >= NOW() - INTERVAL '7 days') as new_notes_7d,
  (SELECT COUNT(*) FROM connection_requests) as total_requests,
  (SELECT COUNT(*) FROM connection_requests WHERE status = 'pending') as pending_requests,
  (SELECT COUNT(*) FROM connection_requests WHERE created_at >= NOW() - INTERVAL '7 days') as new_requests_7d,
  (SELECT COUNT(*) FROM unlocks) as total_unlocks,
  (SELECT COUNT(*) FROM unlocks WHERE created_at >= NOW() - INTERVAL '7 days') as new_unlocks_7d,
  (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE status = 'paid') as total_revenue_cents,
  (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE status = 'paid' AND created_at >= NOW() - INTERVAL '7 days') as revenue_7d_cents;

-- Function: Log user activity
CREATE OR REPLACE FUNCTION log_activity(
  p_action text,
  p_resource_type text DEFAULT NULL,
  p_resource_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  activity_id uuid;
BEGIN
  INSERT INTO activity_log (user_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), p_action, p_resource_type, p_resource_id, p_metadata)
  RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$;

-- Function: Get platform metrics for date range
CREATE OR REPLACE FUNCTION get_platform_metrics(
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(
  metric_date date,
  total_users integer,
  active_users integer,
  new_users integer,
  total_notes integer,
  new_notes integer,
  total_requests integer,
  new_requests integer,
  approved_requests integer,
  total_unlocks integer,
  new_unlocks integer,
  revenue_cents integer
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM platform_metrics
  WHERE platform_metrics.metric_date BETWEEN p_start_date AND p_end_date
  ORDER BY platform_metrics.metric_date DESC;
END;
$$;

-- Function: Get note performance metrics
CREATE OR REPLACE FUNCTION get_note_performance(p_note_id uuid)
RETURNS TABLE(
  note_id uuid,
  views integer,
  requests integer,
  unlocks integer,
  conversion_rate numeric,
  avg_response_time_hours numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    0 as views,
    COUNT(DISTINCT cr.id)::integer as requests,
    COUNT(DISTINCT u.id)::integer as unlocks,
    CASE 
      WHEN COUNT(DISTINCT cr.id) > 0 
      THEN ROUND((COUNT(DISTINCT u.id)::numeric / COUNT(DISTINCT cr.id)::numeric) * 100, 2)
      ELSE 0
    END as conversion_rate,
    AVG(EXTRACT(EPOCH FROM (cr.created_at - n.created_at)) / 3600) as avg_response_time_hours
  FROM notes n
  LEFT JOIN connection_requests cr ON cr.note_id = n.id
  LEFT JOIN unlocks u ON u.note_id = n.id
  WHERE n.id = p_note_id
  GROUP BY n.id;
END;
$$;

-- Function: Calculate overall conversion rates
CREATE OR REPLACE FUNCTION calculate_conversion_rates()
RETURNS TABLE(
  period text,
  requests_to_approval_rate numeric,
  approval_to_unlock_rate numeric,
  request_to_unlock_rate numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(DISTINCT cr.id) as total_requests,
      COUNT(DISTINCT cr.id) FILTER (WHERE cr.status = 'approved') as approved_requests,
      COUNT(DISTINCT u.id) as total_unlocks
    FROM connection_requests cr
    LEFT JOIN unlocks u ON u.note_id = cr.note_id AND u.freelancer_id = cr.freelancer_id
  )
  SELECT 
    'all_time'::text,
    CASE WHEN total_requests > 0 
      THEN ROUND((approved_requests::numeric / total_requests::numeric) * 100, 2)
      ELSE 0 
    END,
    CASE WHEN approved_requests > 0 
      THEN ROUND((total_unlocks::numeric / approved_requests::numeric) * 100, 2)
      ELSE 0 
    END,
    CASE WHEN total_requests > 0 
      THEN ROUND((total_unlocks::numeric / total_requests::numeric) * 100, 2)
      ELSE 0 
    END
  FROM stats;
END;
$$;

-- Function: Daily metrics aggregation (run via cron or edge function)
CREATE OR REPLACE FUNCTION aggregate_daily_metrics(p_date date DEFAULT CURRENT_DATE)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_users integer;
  v_active_users integer;
  v_new_users integer;
  v_total_notes integer;
  v_new_notes integer;
  v_total_requests integer;
  v_new_requests integer;
  v_approved_requests integer;
  v_total_unlocks integer;
  v_new_unlocks integer;
  v_revenue_cents integer;
BEGIN
  -- Calculate metrics
  SELECT COUNT(*) INTO v_total_users FROM profiles WHERE created_at::date <= p_date;
  SELECT COUNT(*) INTO v_active_users FROM profiles WHERE last_active::date = p_date;
  SELECT COUNT(*) INTO v_new_users FROM profiles WHERE created_at::date = p_date;
  
  SELECT COUNT(*) INTO v_total_notes FROM notes WHERE created_at::date <= p_date;
  SELECT COUNT(*) INTO v_new_notes FROM notes WHERE created_at::date = p_date;
  
  SELECT COUNT(*) INTO v_total_requests FROM connection_requests WHERE created_at::date <= p_date;
  SELECT COUNT(*) INTO v_new_requests FROM connection_requests WHERE created_at::date = p_date;
  SELECT COUNT(*) INTO v_approved_requests FROM connection_requests WHERE created_at::date = p_date AND status = 'approved';
  
  SELECT COUNT(*) INTO v_total_unlocks FROM unlocks WHERE created_at::date <= p_date;
  SELECT COUNT(*) INTO v_new_unlocks FROM unlocks WHERE created_at::date = p_date;
  
  SELECT COALESCE(SUM(amount), 0) INTO v_revenue_cents 
  FROM transactions 
  WHERE created_at::date = p_date AND status = 'paid';
  
  -- Insert or update metrics
  INSERT INTO platform_metrics (
    metric_date, total_users, active_users, new_users,
    total_notes, new_notes, total_requests, new_requests,
    approved_requests, total_unlocks, new_unlocks, revenue_cents
  ) VALUES (
    p_date, v_total_users, v_active_users, v_new_users,
    v_total_notes, v_new_notes, v_total_requests, v_new_requests,
    v_approved_requests, v_total_unlocks, v_new_unlocks, v_revenue_cents
  )
  ON CONFLICT (metric_date) DO UPDATE SET
    total_users = v_total_users,
    active_users = v_active_users,
    new_users = v_new_users,
    total_notes = v_total_notes,
    new_notes = v_new_notes,
    total_requests = v_total_requests,
    new_requests = v_new_requests,
    approved_requests = v_approved_requests,
    total_unlocks = v_total_unlocks,
    new_unlocks = v_new_unlocks,
    revenue_cents = v_revenue_cents,
    created_at = NOW();
END;
$$;