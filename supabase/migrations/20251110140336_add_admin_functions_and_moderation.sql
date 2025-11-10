/*
  # Add Admin Functions and Moderation System

  ## Overview
  Complete admin system for platform management:
  - Admin role enforcement
  - Content moderation tools
  - User management functions
  - Platform configuration
  - Bulk operations

  ## New Tables
  1. `admin_actions` - Audit log for admin actions
  2. `moderation_queue` - Flagged content for review
  3. `platform_config` - Global configuration settings

  ## New Functions
  1. `is_admin()` - Check if user is admin
  2. `ban_user()` - Ban/suspend users
  3. `flag_content()` - Flag content for moderation
  4. `approve_user()` - Manual user verification
  5. `bulk_update_notes()` - Bulk note operations
  6. `get_admin_dashboard()` - Admin dashboard data

  ## Security
  - All admin functions check for admin role
  - Admin actions are logged
  - Only hello@phuturedigital.co.za has admin access
*/

-- Table: Admin action audit log
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  reason text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_created 
ON admin_actions(admin_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_actions_target 
ON admin_actions(target_type, target_id);

-- Table: Moderation queue
CREATE TABLE IF NOT EXISTS moderation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('note', 'profile', 'comment')),
  content_id uuid NOT NULL,
  reported_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'removed', 'dismissed')),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;

-- RLS: Any authenticated user can report content
CREATE POLICY "Users can report content"
  ON moderation_queue FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reported_by);

-- RLS: Only admins can view moderation queue
CREATE POLICY "Admins can view moderation queue"
  ON moderation_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RLS: Only admins can update moderation queue
CREATE POLICY "Admins can update moderation queue"
  ON moderation_queue FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_moderation_queue_status 
ON moderation_queue(status, created_at DESC) 
WHERE status = 'pending';

-- Table: Platform configuration
CREATE TABLE IF NOT EXISTS platform_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);

-- Insert default config values
INSERT INTO platform_config (key, value, description) VALUES
  ('maintenance_mode', 'false', 'Enable/disable maintenance mode'),
  ('registration_enabled', 'true', 'Allow new user registration'),
  ('default_request_limit', '10', 'Default daily request limit for new users'),
  ('unlock_price_cents', '1500', 'Price to unlock contact info (R15)'),
  ('priority_post_price_cents', '9900', 'Price for priority post (R99)'),
  ('featured_notes_limit', '3', 'Number of featured notes on homepage'),
  ('max_file_size_mb', '5', 'Maximum file upload size in MB'),
  ('allowed_file_types', '["pdf", "doc", "docx", "jpg", "png"]', 'Allowed file upload types'),
  ('email_notifications_enabled', 'true', 'Global email notification switch'),
  ('beta_mode', 'true', 'Platform is in beta mode')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can read config
CREATE POLICY "Anyone can read config"
  ON platform_config FOR SELECT
  TO authenticated
  USING (true);

-- RLS: Only admins can update config
CREATE POLICY "Admins can update config"
  ON platform_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Function: Check if user is admin
CREATE OR REPLACE FUNCTION is_admin(p_user_id uuid DEFAULT NULL)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  SELECT (role = 'admin' OR email = 'hello@phuturedigital.co.za')
  INTO v_is_admin
  FROM profiles
  WHERE id = v_user_id;
  
  RETURN COALESCE(v_is_admin, false);
END;
$$;

-- Function: Log admin action
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action text,
  p_target_type text DEFAULT NULL,
  p_target_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  action_id uuid;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  INSERT INTO admin_actions (admin_id, action, target_type, target_id, reason, metadata)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, p_reason, p_metadata)
  RETURNING id INTO action_id;
  
  RETURN action_id;
END;
$$;

-- Function: Ban user
CREATE OR REPLACE FUNCTION ban_user(
  p_user_id uuid,
  p_reason text
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Update profile
  UPDATE profiles
  SET 
    role = 'banned',
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Soft delete all user's notes
  UPDATE notes
  SET 
    status = 'deleted',
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND status != 'deleted';
  
  -- Log action
  PERFORM log_admin_action('ban_user', 'profile', p_user_id, p_reason);
  
  RETURN true;
END;
$$;

-- Function: Verify user
CREATE OR REPLACE FUNCTION verify_user(
  p_user_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Update profile
  UPDATE profiles
  SET 
    verified = true,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Log action
  PERFORM log_admin_action('verify_user', 'profile', p_user_id, p_notes);
  
  RETURN true;
END;
$$;

-- Function: Remove content
CREATE OR REPLACE FUNCTION remove_content(
  p_content_type text,
  p_content_id uuid,
  p_reason text
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Remove based on type
  IF p_content_type = 'note' THEN
    UPDATE notes
    SET status = 'deleted', updated_at = NOW()
    WHERE id = p_content_id;
  ELSIF p_content_type = 'profile' THEN
    UPDATE profiles
    SET role = 'banned', updated_at = NOW()
    WHERE id = p_content_id;
  END IF;
  
  -- Log action
  PERFORM log_admin_action('remove_content', p_content_type, p_content_id, p_reason);
  
  RETURN true;
END;
$$;

-- Function: Update platform config
CREATE OR REPLACE FUNCTION update_config(
  p_key text,
  p_value jsonb
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  UPDATE platform_config
  SET 
    value = p_value,
    updated_by = auth.uid(),
    updated_at = NOW()
  WHERE key = p_key;
  
  -- Log action
  PERFORM log_admin_action('update_config', 'config', NULL, p_key, 
    jsonb_build_object('key', p_key, 'value', p_value));
  
  RETURN true;
END;
$$;

-- Function: Get admin dashboard data
CREATE OR REPLACE FUNCTION get_admin_dashboard()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  dashboard_data jsonb;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  SELECT jsonb_build_object(
    'users', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM profiles),
      'active_7d', (SELECT COUNT(*) FROM profiles WHERE last_active >= NOW() - INTERVAL '7 days'),
      'new_today', (SELECT COUNT(*) FROM profiles WHERE created_at::date = CURRENT_DATE),
      'verified', (SELECT COUNT(*) FROM profiles WHERE verified = true),
      'banned', (SELECT COUNT(*) FROM profiles WHERE role = 'banned')
    ),
    'notes', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM notes WHERE status != 'deleted'),
      'open', (SELECT COUNT(*) FROM notes WHERE status = 'open'),
      'fulfilled', (SELECT COUNT(*) FROM notes WHERE status = 'fulfilled'),
      'today', (SELECT COUNT(*) FROM notes WHERE created_at::date = CURRENT_DATE)
    ),
    'requests', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM connection_requests),
      'pending', (SELECT COUNT(*) FROM connection_requests WHERE status = 'pending'),
      'today', (SELECT COUNT(*) FROM connection_requests WHERE created_at::date = CURRENT_DATE)
    ),
    'moderation', jsonb_build_object(
      'pending', (SELECT COUNT(*) FROM moderation_queue WHERE status = 'pending')
    ),
    'revenue', jsonb_build_object(
      'total_cents', (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE status = 'paid'),
      'today_cents', (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE status = 'paid' AND created_at::date = CURRENT_DATE),
      'month_cents', (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE status = 'paid' AND created_at >= DATE_TRUNC('month', CURRENT_DATE))
    )
  ) INTO dashboard_data;
  
  RETURN dashboard_data;
END;
$$;

-- Function: Bulk update user limits
CREATE OR REPLACE FUNCTION bulk_update_user_limits(
  p_user_ids uuid[],
  p_new_limit integer
)
RETURNS integer
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count integer;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  UPDATE profiles
  SET daily_request_limit = p_new_limit,
      updated_at = NOW()
  WHERE id = ANY(p_user_ids);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Log action
  PERFORM log_admin_action('bulk_update_limits', 'profiles', NULL, 
    'Updated ' || updated_count || ' users',
    jsonb_build_object('count', updated_count, 'new_limit', p_new_limit));
  
  RETURN updated_count;
END;
$$;

-- Function: Get moderation queue
CREATE OR REPLACE FUNCTION get_moderation_queue(p_status text DEFAULT 'pending')
RETURNS TABLE(
  id uuid,
  content_type text,
  content_id uuid,
  reported_by_email text,
  reason text,
  status text,
  created_at timestamptz,
  content_preview text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  RETURN QUERY
  SELECT 
    mq.id,
    mq.content_type,
    mq.content_id,
    p.email as reported_by_email,
    mq.reason,
    mq.status,
    mq.created_at,
    CASE 
      WHEN mq.content_type = 'note' THEN (SELECT LEFT(body, 100) FROM notes WHERE notes.id = mq.content_id)
      ELSE NULL
    END as content_preview
  FROM moderation_queue mq
  LEFT JOIN profiles p ON p.id = mq.reported_by
  WHERE mq.status = p_status
  ORDER BY mq.created_at DESC;
END;
$$;

-- Grant admin role to hello@phuturedigital.co.za
DO $$
BEGIN
  UPDATE profiles 
  SET role = 'admin' 
  WHERE email = 'hello@phuturedigital.co.za'
    AND role != 'admin';
END $$;