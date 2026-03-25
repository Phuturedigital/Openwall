-- Remove role/intent blocking from all DB functions and triggers.
-- Any authenticated user can now unlock any note they don't own.

-- 1. unlock_note_beta_free: remove intent check entirely
CREATE OR REPLACE FUNCTION public.unlock_note_beta_free(p_note_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM notes WHERE id = p_note_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Note not found');
  END IF;
  IF EXISTS (SELECT 1 FROM notes WHERE id = p_note_id AND user_id = v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot unlock your own note');
  END IF;
  IF EXISTS (SELECT 1 FROM unlocks WHERE note_id = p_note_id AND freelancer_id = v_user_id) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already unlocked');
  END IF;
  INSERT INTO unlocks (note_id, freelancer_id, amount_paid, unlock_type, payment_status)
  VALUES (p_note_id, v_user_id, 0, 'beta_free', 'paid');
  RETURN jsonb_build_object('success', true, 'message', 'Note unlocked');
END;
$$;

-- 2. verify_vendor_unlock trigger: remove intent/role check entirely
CREATE OR REPLACE FUNCTION public.verify_vendor_unlock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- No role restriction: any authenticated user can unlock any note they don't own.
  RETURN NEW;
END;
$$;

-- 3. Add bio column to profiles if missing
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text;
