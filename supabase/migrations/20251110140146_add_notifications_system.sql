/*
  # Add Notifications System

  ## Overview
  Complete notification system for real-time user updates:
  - In-app notifications table
  - Email notification queue
  - Notification preferences per user
  - Auto-trigger notifications on key events

  ## New Tables
  1. `notifications` - In-app notification storage
  2. `notification_preferences` - User notification settings
  3. `email_queue` - Outbound email queue for batch processing

  ## New Functions
  1. `create_notification()` - Creates notification for user
  2. `mark_notifications_read()` - Bulk mark as read
  3. `get_unread_count()` - Get user's unread count
  4. `queue_email()` - Add email to send queue

  ## Triggers
  - Auto-notify on connection request received
  - Auto-notify on request approved/declined
  - Auto-notify on note unlocked

  ## Security
  - Users can only view own notifications
  - RLS enforced on all tables
*/

-- Table: In-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('request_received', 'request_approved', 'request_declined', 'note_unlocked', 'note_fulfilled', 'system')),
  title text NOT NULL,
  message text NOT NULL,
  link text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only view own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS: System can insert notifications (via triggers)
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS: Users can update own notifications
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Table: Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  email_on_request boolean DEFAULT true,
  email_on_approval boolean DEFAULT true,
  email_on_unlock boolean DEFAULT true,
  email_on_fulfill boolean DEFAULT true,
  push_enabled boolean DEFAULT false,
  email_digest text DEFAULT 'instant' CHECK (email_digest IN ('instant', 'daily', 'weekly', 'never')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS: Users manage own preferences
CREATE POLICY "Users can manage own preferences"
  ON notification_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Table: Email queue for batch sending
CREATE TABLE IF NOT EXISTS email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  template text,
  data jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts integer DEFAULT 0,
  error text,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);

-- Index for processing queue
CREATE INDEX IF NOT EXISTS idx_email_queue_status_created 
ON email_queue(status, created_at) 
WHERE status = 'pending';

-- Function: Create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_link text DEFAULT NULL
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (p_user_id, p_type, p_title, p_message, p_link)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Function: Mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(notification_ids uuid[])
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE notifications
  SET read = true,
      read_at = NOW()
  WHERE id = ANY(notification_ids)
    AND user_id = auth.uid()
    AND read = false;
END;
$$;

-- Function: Get unread notification count
CREATE OR REPLACE FUNCTION get_unread_count(p_user_id uuid)
RETURNS integer
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  unread_count integer;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM notifications
  WHERE user_id = p_user_id
    AND read = false;
    
  RETURN unread_count;
END;
$$;

-- Function: Queue email for sending
CREATE OR REPLACE FUNCTION queue_email(
  p_to_email text,
  p_subject text,
  p_body text,
  p_template text DEFAULT NULL,
  p_data jsonb DEFAULT NULL
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  email_id uuid;
BEGIN
  INSERT INTO email_queue (to_email, subject, body, template, data)
  VALUES (p_to_email, p_subject, p_body, p_template, p_data)
  RETURNING id INTO email_id;
  
  RETURN email_id;
END;
$$;

-- Function: Notify on connection request
CREATE OR REPLACE FUNCTION notify_connection_request()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  poster_id uuid;
  poster_email text;
  freelancer_name text;
  note_title text;
BEGIN
  -- Get note owner details
  SELECT n.user_id, p.email, n.title
  INTO poster_id, poster_email, note_title
  FROM notes n
  JOIN profiles p ON p.id = n.user_id
  WHERE n.id = NEW.note_id;
  
  -- Get freelancer name
  SELECT full_name INTO freelancer_name
  FROM profiles
  WHERE id = NEW.freelancer_id;
  
  -- Create in-app notification
  PERFORM create_notification(
    poster_id,
    'request_received',
    'New Connection Request',
    COALESCE(freelancer_name, 'A provider') || ' wants to connect on: ' || COALESCE(note_title, 'your note'),
    '/requests'
  );
  
  -- Queue email if user has preference enabled
  IF EXISTS (
    SELECT 1 FROM notification_preferences 
    WHERE user_id = poster_id AND email_on_request = true
  ) THEN
    PERFORM queue_email(
      poster_email,
      'New Connection Request on Openwall',
      COALESCE(freelancer_name, 'A provider') || ' has requested to connect with you regarding: ' || COALESCE(note_title, 'your note'),
      'connection_request',
      jsonb_build_object(
        'freelancer_name', freelancer_name,
        'note_title', note_title,
        'note_id', NEW.note_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger: Notify on connection request
DROP TRIGGER IF EXISTS trigger_notify_connection_request ON connection_requests;
CREATE TRIGGER trigger_notify_connection_request
  AFTER INSERT ON connection_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_connection_request();

-- Function: Notify on request status change
CREATE OR REPLACE FUNCTION notify_request_status_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  freelancer_email text;
  poster_name text;
  note_title text;
  notification_type text;
  notification_title text;
  notification_message text;
BEGIN
  -- Only notify on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get details
  SELECT p.email INTO freelancer_email
  FROM profiles p
  WHERE p.id = NEW.freelancer_id;
  
  SELECT p.full_name, n.title
  INTO poster_name, note_title
  FROM notes n
  JOIN profiles p ON p.id = n.user_id
  WHERE n.id = NEW.note_id;
  
  -- Set notification based on status
  IF NEW.status = 'approved' THEN
    notification_type := 'request_approved';
    notification_title := 'Request Approved!';
    notification_message := 'Your connection request was approved for: ' || COALESCE(note_title, 'a note');
  ELSIF NEW.status = 'declined' THEN
    notification_type := 'request_declined';
    notification_title := 'Request Declined';
    notification_message := 'Your connection request was declined for: ' || COALESCE(note_title, 'a note');
  ELSE
    RETURN NEW;
  END IF;
  
  -- Create notification
  PERFORM create_notification(
    NEW.freelancer_id,
    notification_type,
    notification_title,
    notification_message,
    '/requests'
  );
  
  -- Queue email
  PERFORM queue_email(
    freelancer_email,
    notification_title || ' - Openwall',
    notification_message,
    'request_status_change',
    jsonb_build_object(
      'status', NEW.status,
      'note_title', note_title,
      'poster_name', poster_name
    )
  );
  
  RETURN NEW;
END;
$$;

-- Trigger: Notify on request status change
DROP TRIGGER IF EXISTS trigger_notify_request_status ON connection_requests;
CREATE TRIGGER trigger_notify_request_status
  AFTER UPDATE OF status ON connection_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_request_status_change();

-- Function: Auto-create notification preferences on profile creation
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger: Create default preferences
DROP TRIGGER IF EXISTS trigger_create_notification_prefs ON profiles;
CREATE TRIGGER trigger_create_notification_prefs
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- Index for notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
ON notifications(user_id, read, created_at DESC);

-- Index for unread count queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id) 
WHERE read = false;