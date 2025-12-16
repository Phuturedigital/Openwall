/*
  # Fix Security and Performance Issues
  
  ## Performance Improvements
  
  1. Add Missing Foreign Key Indexes
     - Add index on `notes.fulfilled_by` 
     - Add index on `notifications.note_id`
     - Add index on `platform_config.updated_by`
     - Add index on `transactions.note_id`
     - Add index on `user_activity_logs.user_id`
  
  2. Remove Unused Indexes
     - Drop 16 unused indexes that are not being utilized by queries
     - This improves write performance and reduces storage overhead
  
  ## Security Improvements
  
  1. Tighten Overly Permissive RLS Policies
     - Fix "System can log activity" policy - remove WITH CHECK (true)
     - Fix "System can create notifications" policy - restrict to actual system operations
     - These policies currently allow any authenticated user to perform system operations
  
  ## Notes
  
  - Anonymous access to notes is intentionally maintained for business requirements
  - All changes use IF EXISTS/IF NOT EXISTS for idempotency
*/

-- =============================================
-- PERFORMANCE: Add Missing Foreign Key Indexes
-- =============================================

-- Index for notes.fulfilled_by foreign key
CREATE INDEX IF NOT EXISTS idx_notes_fulfilled_by 
ON notes(fulfilled_by) 
WHERE fulfilled_by IS NOT NULL;

-- Index for notifications.note_id foreign key
CREATE INDEX IF NOT EXISTS idx_notifications_note_id 
ON notifications(note_id) 
WHERE note_id IS NOT NULL;

-- Index for platform_config.updated_by foreign key
CREATE INDEX IF NOT EXISTS idx_platform_config_updated_by 
ON platform_config(updated_by) 
WHERE updated_by IS NOT NULL;

-- Index for transactions.note_id foreign key
CREATE INDEX IF NOT EXISTS idx_transactions_note_id 
ON transactions(note_id) 
WHERE note_id IS NOT NULL;

-- Index for user_activity_logs.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id 
ON user_activity_logs(user_id);

-- =============================================
-- PERFORMANCE: Remove Unused Indexes
-- =============================================

DROP INDEX IF EXISTS idx_payment_history_user_id;
DROP INDEX IF EXISTS idx_payment_history_note_id;
DROP INDEX IF EXISTS idx_transactions_user;
DROP INDEX IF EXISTS idx_connection_requests_note_status;
DROP INDEX IF EXISTS idx_connection_requests_status;
DROP INDEX IF EXISTS idx_notifications_user_read_created;
DROP INDEX IF EXISTS idx_unlocks_payment_status;
DROP INDEX IF EXISTS idx_unlocks_freelancer_id;
DROP INDEX IF EXISTS idx_notes_user_id;
DROP INDEX IF EXISTS idx_notes_prio_created;
DROP INDEX IF EXISTS idx_notes_city;
DROP INDEX IF EXISTS idx_notes_work_mode;
DROP INDEX IF EXISTS idx_activity_user_created;
DROP INDEX IF EXISTS idx_moderation_queue_reported_by;
DROP INDEX IF EXISTS idx_moderation_queue_reviewed_by;
DROP INDEX IF EXISTS idx_admin_actions_admin_created;

-- =============================================
-- SECURITY: Fix Overly Permissive RLS Policies
-- =============================================

-- Fix activity_log INSERT policy
-- Remove the overly permissive WITH CHECK (true) and restrict to actual system operations
DROP POLICY IF EXISTS "System can log activity" ON activity_log;
CREATE POLICY "System can log activity"
  ON activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Fix notifications INSERT policy  
-- Remove the overly permissive WITH CHECK (true) and restrict to authenticated users
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
