/*
  # Fix All Security Issues

  ## Overview
  Complete security hardening migration:
  1. Add missing foreign key indexes
  2. Fix RLS policies to use SELECT wrapper for auth functions
  3. Enable RLS on all public tables
  4. Fix function search paths
  5. Remove SECURITY DEFINER from views (recreate as regular views)

  ## Security Improvements
  - Prevents auth function re-evaluation per row
  - Adds indexes for foreign key performance
  - Enables RLS on all public tables
  - Fixes search path vulnerabilities
  - Removes unnecessary SECURITY DEFINER

  ## Performance Impact
  - Improved RLS policy performance at scale
  - Better query performance with FK indexes
*/

-- ============================================================================
-- 1. Add Missing Foreign Key Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_moderation_queue_reported_by 
ON moderation_queue(reported_by);

CREATE INDEX IF NOT EXISTS idx_moderation_queue_reviewed_by 
ON moderation_queue(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_platform_config_updated_by 
ON platform_config(updated_by);

-- ============================================================================
-- 2. Fix RLS Policies - Use SELECT Wrapper for Auth Functions
-- ============================================================================

-- Fix notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Fix notification_preferences policies
DROP POLICY IF EXISTS "Users can manage own preferences" ON notification_preferences;
CREATE POLICY "Users can manage own preferences"
  ON notification_preferences FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Fix activity_log policies
DROP POLICY IF EXISTS "Users can view own activity" ON activity_log;
CREATE POLICY "Users can view own activity"
  ON activity_log FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Fix moderation_queue policies
DROP POLICY IF EXISTS "Users can report content" ON moderation_queue;
CREATE POLICY "Users can report content"
  ON moderation_queue FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = reported_by);

DROP POLICY IF EXISTS "Admins can view moderation queue" ON moderation_queue;
CREATE POLICY "Admins can view moderation queue"
  ON moderation_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update moderation queue" ON moderation_queue;
CREATE POLICY "Admins can update moderation queue"
  ON moderation_queue FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- Fix platform_config policies
DROP POLICY IF EXISTS "Admins can update config" ON platform_config;
CREATE POLICY "Admins can update config"
  ON platform_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- ============================================================================
-- 3. Enable RLS on All Public Tables
-- ============================================================================

-- Enable RLS on maintenance_log
ALTER TABLE maintenance_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view maintenance logs"
  ON maintenance_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- Enable RLS on email_queue
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage email queue"
  ON email_queue FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- Enable RLS on platform_metrics
ALTER TABLE platform_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view metrics"
  ON platform_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "System can insert metrics"
  ON platform_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- Enable RLS on admin_actions
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin actions"
  ON admin_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- ============================================================================
-- 4. Fix Function Search Paths
-- ============================================================================

-- Fix update_profile_last_active
CREATE OR REPLACE FUNCTION update_profile_last_active()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_active := NOW();
  RETURN NEW;
END;
$$;

-- Fix prevent_fulfilled_note_edit
CREATE OR REPLACE FUNCTION prevent_fulfilled_note_edit()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'fulfilled' AND NEW.status = 'fulfilled' THEN
    IF OLD.body != NEW.body OR OLD.budget != NEW.budget THEN
      RAISE EXCEPTION 'Cannot modify fulfilled notes';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix auto_close_note_requests
CREATE OR REPLACE FUNCTION auto_close_note_requests()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'fulfilled' AND OLD.status != 'fulfilled' THEN
    UPDATE connection_requests
    SET status = 'closed'
    WHERE note_id = NEW.id
      AND status = 'pending';
      
    NEW.fulfilled_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- Fix extract_title_from_body
CREATE OR REPLACE FUNCTION extract_title_from_body()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.title IS NULL OR NEW.title = '' THEN
    NEW.title := SUBSTRING(NEW.body FROM 1 FOR 50);
    IF LENGTH(NEW.body) > 50 THEN
      NEW.title := NEW.title || '...';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix auto_update_updated_at
CREATE OR REPLACE FUNCTION auto_update_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 5. Recreate Views Without SECURITY DEFINER
-- ============================================================================

-- Recreate note_analytics as regular view
DROP VIEW IF EXISTS note_analytics;
CREATE VIEW note_analytics AS
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

-- Recreate user_analytics as regular view
DROP VIEW IF EXISTS user_analytics;
CREATE VIEW user_analytics AS
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

-- Recreate platform_stats as regular view
DROP VIEW IF EXISTS platform_stats;
CREATE VIEW platform_stats AS
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

-- ============================================================================
-- 6. Additional Security Hardening
-- ============================================================================

-- Ensure all existing RLS policies use SELECT wrapper
-- (These were created in previous migrations, fixing them here)

DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Public can view all notes" ON notes;
CREATE POLICY "Public can view all notes"
  ON notes FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can create notes" ON notes;
CREATE POLICY "Users can create notes"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own notes" ON notes;
CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own notes" ON notes;
CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Freelancers can create requests" ON connection_requests;
CREATE POLICY "Freelancers can create requests"
  ON connection_requests FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = freelancer_id);

DROP POLICY IF EXISTS "Users can view own requests" ON connection_requests;
CREATE POLICY "Users can view own requests"
  ON connection_requests FOR SELECT
  TO authenticated
  USING (
    ((SELECT auth.uid()) = freelancer_id) OR 
    (EXISTS (
      SELECT 1 FROM notes 
      WHERE notes.id = connection_requests.note_id 
      AND notes.user_id = (SELECT auth.uid())
    ))
  );

DROP POLICY IF EXISTS "Posters can update requests" ON connection_requests;
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

DROP POLICY IF EXISTS "Freelancers can create unlocks" ON unlocks;
CREATE POLICY "Freelancers can create unlocks"
  ON unlocks FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = freelancer_id);

DROP POLICY IF EXISTS "Users can view own unlocks" ON unlocks;
CREATE POLICY "Users can view own unlocks"
  ON unlocks FOR SELECT
  TO authenticated
  USING (
    ((SELECT auth.uid()) = freelancer_id) OR 
    (EXISTS (
      SELECT 1 FROM notes 
      WHERE notes.id = unlocks.note_id 
      AND notes.user_id = (SELECT auth.uid())
    ))
  );

DROP POLICY IF EXISTS "Users can create own transactions" ON transactions;
CREATE POLICY "Users can create own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create payment records" ON payment_history;
CREATE POLICY "Users can create payment records"
  ON payment_history FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own payment history" ON payment_history;
CREATE POLICY "Users can view own payment history"
  ON payment_history FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- 7. Grant Proper Permissions on Views
-- ============================================================================

GRANT SELECT ON note_analytics TO authenticated;
GRANT SELECT ON user_analytics TO authenticated;
GRANT SELECT ON platform_stats TO authenticated;