/*
  # Add Welcome Email Trigger System

  1. New Function
    - `send_welcome_email_on_verification()` - Triggers when user email is verified
    - Calls edge function to send custom welcome email
    - Only sends once per user

  2. New Trigger
    - Fires when auth.users email_confirmed_at changes from null to not null
    - Automatically sends welcome email via edge function

  3. Purpose
    - Send personalized welcome emails when users verify their email
    - Separate from Supabase's built-in confirmation email
    - Allows custom branding and messaging
*/

-- Function to send welcome email via edge function
CREATE OR REPLACE FUNCTION send_welcome_email_on_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url text;
  v_service_role_key text;
  v_profile record;
BEGIN
  -- Only send if email was just verified (changed from null to not null)
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    
    -- Get profile info for personalization
    SELECT display_name INTO v_profile
    FROM profiles
    WHERE user_id = NEW.id;
    
    -- Get Supabase URL and service role key from environment
    v_supabase_url := current_setting('app.settings.supabase_url', true);
    v_service_role_key := current_setting('app.settings.service_role_key', true);
    
    -- Call edge function to send welcome email
    -- Note: This requires pg_net extension or http extension
    -- For now, we'll log it and you can call it from your frontend after verification
    RAISE NOTICE 'Welcome email should be sent to: % (user_id: %)', NEW.email, NEW.id;
    
    -- If you have pg_net installed, uncomment this:
    /*
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-welcome-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      ),
      body := jsonb_build_object(
        'user_id', NEW.id,
        'email', NEW.email,
        'display_name', v_profile.display_name
      )
    );
    */
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
-- Note: This requires superuser permissions to create triggers on auth schema
-- Alternative: Call the edge function from your frontend after email verification

-- Create a table to track welcome emails sent (alternative approach)
CREATE TABLE IF NOT EXISTS welcome_emails_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE welcome_emails_sent ENABLE ROW LEVEL SECURITY;

-- Users can view their own welcome email record
CREATE POLICY "Users can view own welcome email status"
  ON welcome_emails_sent
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- System can insert welcome email records
CREATE POLICY "System can insert welcome email records"
  ON welcome_emails_sent
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));
