/*
  # User Activity Logs Table

  1. New Tables
    - `user_activity_logs`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, foreign key) - References auth.users
      - `action` (text) - Description of the action performed
      - `ip_address` (text, optional) - IP address of the user
      - `user_agent` (text, optional) - Browser/device information
      - `created_at` (timestamptz) - Timestamp of the action

  2. Security
    - Enable RLS on `user_activity_logs` table
    - Users can only read their own activity logs
    - Only authenticated users can view logs
    - System can insert logs (service role)

  3. Indexes
    - Index on `user_id` for fast lookup
    - Index on `created_at` for chronological queries

  4. Purpose
    - Track all account security events (email changes, password resets, etc.)
    - Provide audit trail for user actions
    - Help detect suspicious activity
*/

-- Create user_activity_logs table
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own activity logs"
  ON user_activity_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id 
  ON user_activity_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at 
  ON user_activity_logs(created_at DESC);

-- Create a function to log user activities
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id uuid,
  p_action text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO user_activity_logs (user_id, action, ip_address, user_agent)
  VALUES (p_user_id, p_action, p_ip_address, p_user_agent)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;
