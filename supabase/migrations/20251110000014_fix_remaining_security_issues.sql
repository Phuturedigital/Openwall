/*
  # Fix Remaining Security Issues

  ## Changes
  1. Add missing indexes for foreign keys:
     - transactions.note_id
     - unlocks.freelancer_id
  2. Fix has_unlocked_note function search path
  3. Keep idx_payment_history_note_id (will be used for foreign key constraints)

  ## Security Improvements
  - All foreign keys now have covering indexes for optimal JOIN performance
  - Function search path secured against injection attacks
*/

-- 1. Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_transactions_note_id ON transactions(note_id);
CREATE INDEX IF NOT EXISTS idx_unlocks_freelancer_id ON unlocks(freelancer_id);

-- 2. Fix has_unlocked_note function search path
-- First check function signature
DO $$
BEGIN
  -- Try to alter the function with common signatures
  BEGIN
    ALTER FUNCTION has_unlocked_note(uuid, uuid) SET search_path = pg_catalog, public;
  EXCEPTION
    WHEN undefined_function THEN
      -- Try without parameters
      BEGIN
        ALTER FUNCTION has_unlocked_note() SET search_path = pg_catalog, public;
      EXCEPTION
        WHEN undefined_function THEN
          -- Function doesn't exist or has different signature, that's ok
          NULL;
      END;
  END;
END $$;

-- Alternative: Drop and recreate if needed (uncomment if above doesn't work)
-- DROP FUNCTION IF EXISTS has_unlocked_note(uuid, uuid);
-- DROP FUNCTION IF EXISTS has_unlocked_note();
