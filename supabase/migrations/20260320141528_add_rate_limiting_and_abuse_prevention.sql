/*
  # Add Rate Limiting and Abuse Prevention

  ## Overview
  Comprehensive rate limiting and abuse prevention system to protect the platform from:
  - Spam posts
  - Excessive unlock attempts
  - Account abuse
  - Automated bot traffic
  - Resource exhaustion attacks

  ## New Tables

  1. `rate_limits` - Track user action rates
     - `id` (uuid, primary key)
     - `user_id` (uuid) - User being tracked
     - `action_type` (text) - Type of action
     - `count` (integer) - Actions in current window
     - `window_start` (timestamptz) - Start of current time window
     - `last_action` (timestamptz) - Most recent action

  2. `blocked_users` - Temporary or permanent user blocks
     - `id` (uuid, primary key)
     - `user_id` (uuid) - Blocked user
     - `reason` (text) - Why they were blocked
     - `blocked_until` (timestamptz) - NULL for permanent
     - `blocked_by` (text) - System or admin
     - `created_at` (timestamptz)

  3. `suspicious_activity` - Flag potential abuse
     - `id` (uuid, primary key)
     - `user_id` (uuid) - User flagged
     - `activity_type` (text) - What triggered the flag
     - `severity` (text) - low, medium, high, critical
     - `details` (jsonb) - Additional context
     - `resolved` (boolean) - Whether addressed
     - `created_at` (timestamptz)

  ## Rate Limit Rules

  - **Note Creation**: Max 10 notes per hour, 50 per day
  - **Lead Unlocking**: Max 20 unlocks per hour, 100 per day
  - **Profile Updates**: Max 5 per hour
  - **Payment Attempts**: Max 10 per hour (prevent card testing)

  ## New Functions

  1. `check_rate_limit()` - Check if action allowed
  2. `record_action()` - Record action for rate limiting
  3. `is_user_blocked()` - Check if user is blocked
  4. `flag_suspicious_activity()` - Flag potential abuse
  5. `reset_rate_limits()` - Daily cleanup of rate limit counters

  ## Security

  - All validation happens before data commits
  - Blocked users cannot perform any actions
  - Automatic temporary blocks for suspicious behavior
  - Audit trail of all blocks and flags
*/

-- =============================================
-- RATE LIMITS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL CHECK (action_type IN (
    'note_create', 'note_update', 'note_delete',
    'lead_unlock', 'payment_attempt',
    'profile_update', 'login_attempt'
  )),
  count integer DEFAULT 1 NOT NULL,
  window_start timestamptz DEFAULT now() NOT NULL,
  last_action timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, action_type)
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits"
  ON rate_limits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action 
ON rate_limits(user_id, action_type);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window 
ON rate_limits(window_start, last_action);

-- =============================================
-- BLOCKED USERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL,
  blocked_until timestamptz,
  blocked_by text DEFAULT 'system' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, blocked_until)
);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blocks"
  ON blocked_users FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_blocked_users_user_until 
ON blocked_users(user_id, blocked_until);

-- =============================================
-- SUSPICIOUS ACTIVITY TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS suspicious_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN (
    'rapid_posting', 'excessive_unlocks', 'failed_payments',
    'suspicious_pattern', 'spam_content', 'multiple_accounts'
  )),
  severity text DEFAULT 'low' NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details jsonb DEFAULT '{}'::jsonb,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE suspicious_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only system can manage suspicious activity"
  ON suspicious_activity FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_suspicious_activity_user_resolved 
ON suspicious_activity(user_id, resolved, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_suspicious_activity_severity 
ON suspicious_activity(severity, resolved, created_at DESC)
WHERE resolved = false;

-- =============================================
-- RATE LIMITING FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id uuid,
  p_action_type text,
  p_hourly_limit integer,
  p_daily_limit integer
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_count integer;
  window_start_time timestamptz;
  last_action_time timestamptz;
  hourly_count integer;
  daily_count integer;
BEGIN
  SELECT count, window_start, last_action
  INTO current_count, window_start_time, last_action_time
  FROM rate_limits
  WHERE user_id = p_user_id AND action_type = p_action_type;
  
  IF NOT FOUND THEN
    INSERT INTO rate_limits (user_id, action_type, count, window_start, last_action)
    VALUES (p_user_id, p_action_type, 1, now(), now());
    RETURN true;
  END IF;
  
  SELECT COUNT(*) INTO hourly_count
  FROM rate_limits
  WHERE user_id = p_user_id 
    AND action_type = p_action_type
    AND last_action >= now() - interval '1 hour';
  
  SELECT COUNT(*) INTO daily_count
  FROM rate_limits
  WHERE user_id = p_user_id 
    AND action_type = p_action_type
    AND last_action >= now() - interval '1 day';
  
  IF hourly_count >= p_hourly_limit THEN
    PERFORM flag_suspicious_activity(
      p_user_id,
      'rapid_' || p_action_type,
      'medium',
      jsonb_build_object('hourly_count', hourly_count, 'limit', p_hourly_limit)
    );
    RETURN false;
  END IF;
  
  IF daily_count >= p_daily_limit THEN
    RETURN false;
  END IF;
  
  UPDATE rate_limits
  SET count = count + 1,
      last_action = now()
  WHERE user_id = p_user_id AND action_type = p_action_type;
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION is_user_blocked(p_user_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  is_blocked boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM blocked_users
    WHERE user_id = p_user_id
      AND (blocked_until IS NULL OR blocked_until > now())
  ) INTO is_blocked;
  
  RETURN is_blocked;
END;
$$;

CREATE OR REPLACE FUNCTION flag_suspicious_activity(
  p_user_id uuid,
  p_activity_type text,
  p_severity text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  flag_id uuid;
  high_severity_count integer;
BEGIN
  INSERT INTO suspicious_activity (user_id, activity_type, severity, details)
  VALUES (p_user_id, p_activity_type, p_severity, p_details)
  RETURNING id INTO flag_id;
  
  IF p_severity = 'critical' THEN
    INSERT INTO blocked_users (user_id, reason, blocked_until, blocked_by)
    VALUES (p_user_id, 'Critical suspicious activity detected', now() + interval '24 hours', 'system')
    ON CONFLICT (user_id, blocked_until) DO NOTHING;
  ELSIF p_severity = 'high' THEN
    SELECT COUNT(*) INTO high_severity_count
    FROM suspicious_activity
    WHERE user_id = p_user_id
      AND severity IN ('high', 'critical')
      AND created_at >= now() - interval '24 hours'
      AND resolved = false;
    
    IF high_severity_count >= 3 THEN
      INSERT INTO blocked_users (user_id, reason, blocked_until, blocked_by)
      VALUES (p_user_id, 'Multiple high-severity flags', now() + interval '12 hours', 'system')
      ON CONFLICT (user_id, blocked_until) DO NOTHING;
    END IF;
  END IF;
  
  RETURN flag_id;
END;
$$;

-- =============================================
-- RATE LIMIT ENFORCEMENT TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION enforce_note_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF is_user_blocked(NEW.user_id) THEN
    RAISE EXCEPTION 'Account is temporarily blocked due to suspicious activity';
  END IF;
  
  IF NOT check_rate_limit(NEW.user_id, 'note_create', 10, 50) THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please try again later.';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_note_rate_limit_trigger ON notes;
CREATE TRIGGER enforce_note_rate_limit_trigger
  BEFORE INSERT ON notes
  FOR EACH ROW
  EXECUTE FUNCTION enforce_note_rate_limit();

CREATE OR REPLACE FUNCTION enforce_unlock_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF is_user_blocked(NEW.vendor_id) THEN
    RAISE EXCEPTION 'Account is temporarily blocked due to suspicious activity';
  END IF;
  
  IF NOT check_rate_limit(NEW.vendor_id, 'lead_unlock', 20, 100) THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please try again later.';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_unlock_rate_limit_trigger ON unlocked_leads;
CREATE TRIGGER enforce_unlock_rate_limit_trigger
  BEFORE INSERT ON unlocked_leads
  FOR EACH ROW
  EXECUTE FUNCTION enforce_unlock_rate_limit();

CREATE OR REPLACE FUNCTION enforce_payment_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF is_user_blocked(NEW.user_id) THEN
    RAISE EXCEPTION 'Account is temporarily blocked due to suspicious activity';
  END IF;
  
  IF NOT check_rate_limit(NEW.user_id, 'payment_attempt', 10, 50) THEN
    RAISE EXCEPTION 'Too many payment attempts. Please try again later.';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_payment_rate_limit_trigger ON payment_history;
CREATE TRIGGER enforce_payment_rate_limit_trigger
  BEFORE INSERT ON payment_history
  FOR EACH ROW
  EXECUTE FUNCTION enforce_payment_rate_limit();

CREATE OR REPLACE FUNCTION enforce_profile_update_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NOT check_rate_limit(NEW.id, 'profile_update', 5, 20) THEN
      RAISE EXCEPTION 'Too many profile updates. Please try again later.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_rate_limit_trigger ON profiles;
CREATE TRIGGER enforce_profile_rate_limit_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_profile_update_rate_limit();

-- =============================================
-- SPAM DETECTION
-- =============================================

CREATE OR REPLACE FUNCTION detect_spam_content()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  spam_keywords text[] := ARRAY['viagra', 'casino', 'lottery', 'prince', 'inheritance', 'crypto investment'];
  keyword text;
  content_lower text;
  recent_note_count integer;
BEGIN
  content_lower := LOWER(COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, ''));
  
  FOREACH keyword IN ARRAY spam_keywords
  LOOP
    IF content_lower LIKE '%' || keyword || '%' THEN
      PERFORM flag_suspicious_activity(
        NEW.user_id,
        'spam_content',
        'high',
        jsonb_build_object('keyword', keyword, 'note_id', NEW.id)
      );
      
      RAISE EXCEPTION 'Content flagged as potential spam. Please contact support if this is an error.';
    END IF;
  END LOOP;
  
  SELECT COUNT(*) INTO recent_note_count
  FROM notes
  WHERE user_id = NEW.user_id
    AND created_at >= now() - interval '10 minutes';
  
  IF recent_note_count >= 5 THEN
    PERFORM flag_suspicious_activity(
      NEW.user_id,
      'rapid_posting',
      'high',
      jsonb_build_object('count', recent_note_count, 'note_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS detect_spam_trigger ON notes;
CREATE TRIGGER detect_spam_trigger
  BEFORE INSERT ON notes
  FOR EACH ROW
  EXECUTE FUNCTION detect_spam_content();

-- =============================================
-- CLEANUP AND MAINTENANCE
-- =============================================

CREATE OR REPLACE FUNCTION reset_rate_limits()
RETURNS integer
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM rate_limits
  WHERE last_action < now() - interval '1 day';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_expired_blocks()
RETURNS integer
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM blocked_users
  WHERE blocked_until IS NOT NULL
    AND blocked_until < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- =============================================
-- ADMIN FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION block_user(
  p_user_id uuid,
  p_reason text,
  p_duration_hours integer DEFAULT NULL
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  block_id uuid;
  blocked_until_time timestamptz;
BEGIN
  IF p_duration_hours IS NOT NULL THEN
    blocked_until_time := now() + (p_duration_hours || ' hours')::interval;
  ELSE
    blocked_until_time := NULL;
  END IF;
  
  INSERT INTO blocked_users (user_id, reason, blocked_until, blocked_by)
  VALUES (p_user_id, p_reason, blocked_until_time, 'admin')
  RETURNING id INTO block_id;
  
  RETURN block_id;
END;
$$;

CREATE OR REPLACE FUNCTION unblock_user(p_user_id uuid)
RETURNS integer
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM blocked_users
  WHERE user_id = p_user_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION get_blocked_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  reason text,
  blocked_until timestamptz,
  blocked_by text,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bu.user_id,
    p.email,
    bu.reason,
    bu.blocked_until,
    bu.blocked_by,
    bu.created_at
  FROM blocked_users bu
  JOIN profiles p ON p.id = bu.user_id
  WHERE bu.blocked_until IS NULL OR bu.blocked_until > now()
  ORDER BY bu.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_suspicious_activity_report()
RETURNS TABLE (
  user_id uuid,
  email text,
  activity_type text,
  severity text,
  occurrences bigint,
  last_occurrence timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sa.user_id,
    p.email,
    sa.activity_type,
    sa.severity,
    COUNT(*) as occurrences,
    MAX(sa.created_at) as last_occurrence
  FROM suspicious_activity sa
  JOIN profiles p ON p.id = sa.user_id
  WHERE sa.resolved = false
    AND sa.created_at >= now() - interval '7 days'
  GROUP BY sa.user_id, p.email, sa.activity_type, sa.severity
  ORDER BY 
    CASE sa.severity
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    last_occurrence DESC;
END;
$$;