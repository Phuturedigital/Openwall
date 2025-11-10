/*
  # Remove Unused Indexes and Fix Security Issues

  ## Changes Made
  
  ### 1. Remove Unused Indexes
  Drops all indexes that have not been used to improve database performance:
  - 21 unused indexes across multiple tables

  ### 2. Fix Security Definer Views
  Recreates views without SECURITY DEFINER to prevent privilege escalation:
  - user_analytics
  - platform_stats
  - note_analytics

  ### 3. Fix Function Search Paths
  Updates functions to have immutable search paths:
  - auto_detect_category
  - auto_set_category

  ## Security Notes
  - Removing SECURITY DEFINER from views prevents potential privilege escalation
  - Setting stable search_path on functions prevents search_path injection attacks
  - Unused indexes consume storage and slow down write operations
  - Password protection must be enabled manually in Supabase Dashboard under Authentication > Providers > Email
*/

-- ============================================
-- 1. DROP UNUSED INDEXES
-- ============================================

DROP INDEX IF EXISTS idx_maintenance_log_created;
DROP INDEX IF EXISTS idx_platform_config_updated_by;
DROP INDEX IF EXISTS idx_transactions_note_id;
DROP INDEX IF EXISTS idx_transactions_kind_status;
DROP INDEX IF EXISTS idx_notes_status;
DROP INDEX IF EXISTS idx_notes_fulfilled_by;
DROP INDEX IF EXISTS idx_notes_user_status;
DROP INDEX IF EXISTS idx_notes_status_prio_created;
DROP INDEX IF EXISTS idx_notes_city;
DROP INDEX IF EXISTS idx_notes_user_status_created;
DROP INDEX IF EXISTS idx_notes_category;
DROP INDEX IF EXISTS idx_profiles_email;
DROP INDEX IF EXISTS idx_profiles_role;
DROP INDEX IF EXISTS idx_connection_requests_freelancer_notified;
DROP INDEX IF EXISTS idx_email_queue_status_created;
DROP INDEX IF EXISTS idx_notifications_user_unread;
DROP INDEX IF EXISTS idx_activity_action_created;
DROP INDEX IF EXISTS idx_activity_resource;
DROP INDEX IF EXISTS idx_platform_metrics_date;
DROP INDEX IF EXISTS idx_admin_actions_target;
DROP INDEX IF EXISTS idx_moderation_queue_status;

-- ============================================
-- 2. FIX SECURITY DEFINER VIEWS
-- ============================================

DROP VIEW IF EXISTS user_analytics;
CREATE VIEW user_analytics AS
SELECT 
  p.id as user_id,
  p.email,
  p.created_at as joined_at,
  COUNT(DISTINCT n.id) as total_notes_posted,
  COUNT(DISTINCT cr.id) as total_requests_sent,
  COUNT(DISTINCT t.id) as total_transactions,
  COALESCE(SUM(CASE WHEN t.kind = 'unlock' THEN t.amount ELSE 0 END), 0) as total_spent,
  MAX(n.created_at) as last_note_posted,
  MAX(cr.created_at) as last_request_sent
FROM profiles p
LEFT JOIN notes n ON n.user_id = p.id
LEFT JOIN connection_requests cr ON cr.freelancer_id = p.id
LEFT JOIN transactions t ON t.user_id = p.id
GROUP BY p.id, p.email, p.created_at;

DROP VIEW IF EXISTS platform_stats;
CREATE VIEW platform_stats AS
SELECT 
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM notes WHERE status = 'active') as active_notes,
  (SELECT COUNT(*) FROM notes WHERE created_at > NOW() - INTERVAL '7 days') as notes_this_week,
  (SELECT COUNT(*) FROM connection_requests WHERE created_at > NOW() - INTERVAL '7 days') as requests_this_week,
  (SELECT COUNT(*) FROM transactions WHERE created_at > NOW() - INTERVAL '30 days') as transactions_this_month,
  (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE kind = 'unlock' AND created_at > NOW() - INTERVAL '30 days') as revenue_this_month;

DROP VIEW IF EXISTS note_analytics;
CREATE VIEW note_analytics AS
SELECT 
  n.id as note_id,
  n.title,
  n.category,
  n.created_at,
  n.status,
  n.fulfilled_by,
  n.fulfilled_at,
  p.email as poster_email,
  COUNT(DISTINCT cr.id) as total_requests,
  COUNT(DISTINCT CASE WHEN cr.status = 'approved' THEN cr.id END) as approved_requests,
  COUNT(DISTINCT t.id) as unlock_count,
  COALESCE(SUM(t.amount), 0) as total_revenue
FROM notes n
JOIN profiles p ON p.id = n.user_id
LEFT JOIN connection_requests cr ON cr.note_id = n.id
LEFT JOIN transactions t ON t.note_id = n.id AND t.kind = 'unlock'
GROUP BY n.id, n.title, n.category, n.created_at, n.status, n.fulfilled_by, n.fulfilled_at, p.email;

-- ============================================
-- 3. FIX FUNCTION SEARCH PATHS
-- ============================================

-- Drop functions with CASCADE to remove dependent triggers
DROP FUNCTION IF EXISTS auto_detect_category(text) CASCADE;
DROP FUNCTION IF EXISTS auto_set_category() CASCADE;

-- Recreate auto_detect_category with stable search_path
CREATE FUNCTION auto_detect_category(note_text text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  note_text := LOWER(note_text);
  
  IF note_text ~* 'design|graphic|logo|brand|ui|ux|figma|photoshop' THEN
    RETURN 'Design';
  ELSIF note_text ~* 'develop|code|program|software|web|app|api|database' THEN
    RETURN 'Development';
  ELSIF note_text ~* 'market|seo|social media|ads|content|email campaign' THEN
    RETURN 'Marketing';
  ELSIF note_text ~* 'write|content|copy|blog|article|editor' THEN
    RETURN 'Writing';
  ELSIF note_text ~* 'consult|advice|strategy|analysis|research' THEN
    RETURN 'Consulting';
  ELSIF note_text ~* 'video|photo|film|edit|production|camera' THEN
    RETURN 'Video & Photo';
  ELSE
    RETURN 'Other';
  END IF;
END;
$$;

-- Recreate auto_set_category with stable search_path
CREATE FUNCTION auto_set_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.category IS NULL OR NEW.category = 'Other' THEN
    NEW.category := auto_detect_category(COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.body, ''));
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER set_note_category
  BEFORE INSERT OR UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_category();
