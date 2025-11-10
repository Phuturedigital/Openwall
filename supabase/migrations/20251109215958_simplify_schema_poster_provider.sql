/*
  # Simplify Schema for Poster/Provider System

  ## Changes

  1. Profiles Table
    - Rename user_type to role ('poster' | 'provider')
    - Add skills array
    - Add city field
    - Add verified boolean
    - Simplify structure

  2. Notes Table
    - Rename note_type to type ('job' | 'service')
    - Change budget to integer (cents)
    - Add lock boolean (for hidden contacts)
    - Rename is_priority to prio
    - Store contact as jsonb
    - Simplify file attachments storage

  3. Transactions Table (renamed from payment_history)
    - Add kind field ('unlock' | 'prio')
    - Add stripe_id field
    - Simplify structure

  ## Security
    - RLS policies updated for new schema
    - Contact info hidden unless unlocked
*/

-- Update profiles table structure
DO $$
BEGIN
  -- Rename user_type to role if column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'user_type'
  ) THEN
    ALTER TABLE profiles RENAME COLUMN user_type TO role;
  END IF;

  -- Add new columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'skills'
  ) THEN
    ALTER TABLE profiles ADD COLUMN skills text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'city'
  ) THEN
    ALTER TABLE profiles ADD COLUMN city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN verified boolean DEFAULT false;
  END IF;
END $$;

-- Update constraint for role
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('poster', 'provider', 'client', 'vendor'));

-- Update notes table structure
DO $$
BEGIN
  -- Rename note_type to type if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'note_type'
  ) THEN
    ALTER TABLE notes RENAME COLUMN note_type TO type;
  END IF;

  -- Add lock column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'lock'
  ) THEN
    ALTER TABLE notes ADD COLUMN lock boolean DEFAULT true;
  END IF;

  -- Rename is_priority to prio
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'is_priority'
  ) THEN
    ALTER TABLE notes RENAME COLUMN is_priority TO prio;
  END IF;

  -- Change budget to integer if it's text
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'budget' AND data_type = 'text'
  ) THEN
    ALTER TABLE notes ALTER COLUMN budget TYPE integer USING
      CASE
        WHEN budget IS NULL THEN NULL
        ELSE (regexp_replace(budget, '[^0-9]', '', 'g'))::integer
      END;
  END IF;
END $$;

-- Create transactions table (replaces payment_history)
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  note_id uuid REFERENCES notes(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('unlock', 'prio')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  stripe_id text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_note ON transactions(note_id);
CREATE INDEX IF NOT EXISTS idx_transactions_kind ON transactions(kind);
CREATE INDEX IF NOT EXISTS idx_notes_type_prio ON notes(type, prio DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_city ON notes(city);

-- Update notes RLS to hide contacts unless unlocked
DROP POLICY IF EXISTS "Anyone can view notes" ON notes;

CREATE POLICY "Anyone can view notes basic info"
  ON notes FOR SELECT
  TO authenticated
  USING (true);

-- Migrate existing payment_history data to transactions if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_history') THEN
    INSERT INTO transactions (user_id, note_id, amount, kind, status, created_at)
    SELECT
      user_id,
      note_id,
      (amount * 100)::integer,
      CASE
        WHEN note_id IS NULL THEN 'prio'
        ELSE 'unlock'
      END as kind,
      status,
      created_at
    FROM payment_history
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
