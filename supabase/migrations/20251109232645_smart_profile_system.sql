/*
  # Smart Profile & Request Flow System

  ## Updates to profiles table
  1. Add professional fields for freelancers
    - profession (short text)
    - skills (text array, max 5)
    - bio (max 160 chars)
    - portfolio (jsonb - up to 3 files)
    - experience (text)
    - last_active (auto-updated)
  
  2. Add poster fields
    - industry (text)
    - looking_for (text array)
    - post_visibility (text)

  ## System Logic
  - Role auto-set based on actions
  - Skills and bio visible on request cards
  - Notifications for approved/declined requests
*/

-- Add professional info fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profession text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portfolio jsonb DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active timestamptz DEFAULT now();

-- Add poster fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS looking_for text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS post_visibility text DEFAULT 'public';

-- Add notification fields to connection_requests
ALTER TABLE connection_requests ADD COLUMN IF NOT EXISTS notified boolean DEFAULT false;
ALTER TABLE connection_requests ADD COLUMN IF NOT EXISTS notification_read boolean DEFAULT false;

-- Update last_active trigger
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_last_active_trigger ON profiles;
CREATE TRIGGER profiles_last_active_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_last_active();

-- Add constraints
ALTER TABLE profiles ADD CONSTRAINT bio_max_length CHECK (char_length(bio) <= 160);
ALTER TABLE profiles ADD CONSTRAINT skills_max_length CHECK (array_length(skills, 1) <= 5);
ALTER TABLE profiles ADD CONSTRAINT post_visibility_check CHECK (post_visibility IN ('public', 'private'));

-- Update RLS policies to include new fields
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow viewing other users' basic public info (for request cards)
CREATE POLICY "Users can view public profile info"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);
