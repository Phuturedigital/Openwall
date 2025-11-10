/*
  # Create Transactions Table

  ## Purpose
  Track all payments for unlocks and priority posts

  ## Table
  - transactions (user_id, note_id, amount, kind, status, stripe_id, created_at)

  ## Security
  - RLS enabled
  - Users can only view their own transactions
*/

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

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_note ON transactions(note_id);
CREATE INDEX IF NOT EXISTS idx_transactions_kind ON transactions(kind);
