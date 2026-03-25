-- Fix RPC parameter names, add notes.color column, make transactions.note_id nullable

-- 1. Fix check_user_has_unlocked: rename param note_uuid -> p_note_id (matches frontend calls)
DROP FUNCTION IF EXISTS public.check_user_has_unlocked(uuid);
CREATE FUNCTION public.check_user_has_unlocked(p_note_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM unlocks WHERE note_id = p_note_id AND freelancer_id = auth.uid()
  );
END;
$$;

-- 2. Fix unlock_note_beta_free: rename param note_uuid -> p_note_id (matches frontend calls)
DROP FUNCTION IF EXISTS public.unlock_note_beta_free(uuid);
CREATE FUNCTION public.unlock_note_beta_free(p_note_id uuid)
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
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id AND user_type = 'vendor') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only vendors can unlock notes');
  END IF;
  IF EXISTS (SELECT 1 FROM unlocks WHERE note_id = p_note_id AND freelancer_id = v_user_id) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already unlocked');
  END IF;
  INSERT INTO unlocks (note_id, freelancer_id, amount_paid, unlock_type, payment_status)
  VALUES (p_note_id, v_user_id, 0, 'beta_free', 'paid');
  RETURN jsonb_build_object('success', true, 'message', 'Note unlocked');
END;
$$;

-- 3. Add color column to notes (used by MinimalPostModal for card background)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS color text DEFAULT '#FEF3C7';

-- 4. Make transactions.note_id nullable (priority post transactions are created before note insert)
ALTER TABLE transactions ALTER COLUMN note_id DROP NOT NULL;
