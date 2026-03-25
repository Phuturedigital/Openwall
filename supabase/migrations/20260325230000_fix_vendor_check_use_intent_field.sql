-- Fix vendor check: use intent = 'offer_services' instead of user_type = 'vendor'
-- Onboarding sets intent field, not user_type, so user_type is always NULL causing
-- "Only vendors can unlock notes" error for all users.

-- 1. Fix unlock_note_beta_free RPC
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
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id AND intent = 'offer_services') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only service providers can unlock notes');
  END IF;
  IF EXISTS (SELECT 1 FROM unlocks WHERE note_id = p_note_id AND freelancer_id = v_user_id) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already unlocked');
  END IF;
  INSERT INTO unlocks (note_id, freelancer_id, amount_paid, unlock_type, payment_status)
  VALUES (p_note_id, v_user_id, 0, 'beta_free', 'paid');
  RETURN jsonb_build_object('success', true, 'message', 'Note unlocked');
END;
$$;

-- 2. Fix verify_vendor_unlock trigger function
CREATE OR REPLACE FUNCTION public.verify_vendor_unlock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.freelancer_id AND intent = 'offer_services') THEN
    RAISE EXCEPTION 'Only service providers can unlock notes';
  END IF;
  RETURN NEW;
END;
$$;
