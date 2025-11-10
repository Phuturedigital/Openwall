/*
  # Add Backend Triggers and Database Functions

  ## Overview
  This migration adds essential backend automation for production:
  - Automatic profile creation on user signup
  - Automatic title extraction from note body
  - Timestamp auto-updates
  - Request limit enforcement
  - Status validation triggers

  ## New Functions
  1. `handle_new_user()` - Auto-creates profile when user signs up
  2. `extract_title_from_body()` - Auto-generates note titles
  3. `check_request_limit()` - Enforces daily request limits
  4. `auto_update_updated_at()` - Updates timestamps on changes
  5. `reset_daily_request_counts()` - Scheduled reset function

  ## New Triggers
  1. Profile auto-creation trigger on auth.users
  2. Title extraction trigger on notes insert
  3. Updated_at trigger on notes/profiles
  4. Request limit validation trigger

  ## Security
  - All functions execute with proper security context
  - RLS policies remain enforced
  - No elevation of privileges
*/

-- Function: Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
END;
$$;

-- Trigger: Create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function: Auto-extract title from note body
CREATE OR REPLACE FUNCTION extract_title_from_body()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If title is empty, extract first 50 chars from body
  IF NEW.title IS NULL OR NEW.title = '' THEN
    NEW.title := SUBSTRING(NEW.body FROM 1 FOR 50);
    IF LENGTH(NEW.body) > 50 THEN
      NEW.title := NEW.title || '...';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger: Extract title on note insert or update
DROP TRIGGER IF EXISTS extract_note_title ON notes;
CREATE TRIGGER extract_note_title
  BEFORE INSERT OR UPDATE OF body ON notes
  FOR EACH ROW
  EXECUTE FUNCTION extract_title_from_body();

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION auto_update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- Trigger: Update timestamp on notes changes
DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_updated_at();

-- Function: Check daily request limit
CREATE OR REPLACE FUNCTION check_request_limit()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  request_count INTEGER;
  user_limit INTEGER;
BEGIN
  -- Get user's daily limit
  SELECT daily_request_limit INTO user_limit
  FROM profiles
  WHERE id = NEW.freelancer_id;

  -- Count today's requests
  SELECT COUNT(*) INTO request_count
  FROM connection_requests
  WHERE freelancer_id = NEW.freelancer_id
    AND created_at >= CURRENT_DATE;

  -- Enforce limit
  IF request_count >= user_limit THEN
    RAISE EXCEPTION 'Daily request limit reached. Please try again tomorrow.';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: Enforce request limits
DROP TRIGGER IF EXISTS enforce_request_limit ON connection_requests;
CREATE TRIGGER enforce_request_limit
  BEFORE INSERT ON connection_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_request_limit();

-- Function: Reset daily request counts (scheduled daily via cron or edge function)
CREATE OR REPLACE FUNCTION reset_daily_request_counts()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE notes
  SET daily_request_count = 0,
      last_request_reset = NOW()
  WHERE last_request_reset < CURRENT_DATE;
END;
$$;

-- Function: Auto-update last_active on profile changes
CREATE OR REPLACE FUNCTION update_profile_last_active()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_active := NOW();
  RETURN NEW;
END;
$$;

-- Trigger: Update last_active timestamp
DROP TRIGGER IF EXISTS update_profiles_last_active ON profiles;
CREATE TRIGGER update_profiles_last_active
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_last_active();

-- Function: Prevent modification of fulfilled notes
CREATE OR REPLACE FUNCTION prevent_fulfilled_note_edit()
RETURNS TRIGGER
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

-- Trigger: Protect fulfilled notes
DROP TRIGGER IF EXISTS protect_fulfilled_notes ON notes;
CREATE TRIGGER protect_fulfilled_notes
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION prevent_fulfilled_note_edit();

-- Function: Auto-close connection requests when note is fulfilled
CREATE OR REPLACE FUNCTION auto_close_note_requests()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'fulfilled' AND OLD.status != 'fulfilled' THEN
    -- Close all pending requests for this note
    UPDATE connection_requests
    SET status = 'closed'
    WHERE note_id = NEW.id
      AND status = 'pending';
      
    -- Set fulfilled_at timestamp
    NEW.fulfilled_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger: Auto-close requests on fulfillment
DROP TRIGGER IF EXISTS close_requests_on_fulfill ON notes;
CREATE TRIGGER close_requests_on_fulfill
  BEFORE UPDATE OF status ON notes
  FOR EACH ROW
  WHEN (NEW.status = 'fulfilled')
  EXECUTE FUNCTION auto_close_note_requests();