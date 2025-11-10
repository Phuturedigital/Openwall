/*
  # Request-to-Connect System

  ## New Tables
  1. connection_requests
    - id, note_id, freelancer_id, status, created_at
    - Tracks all connection requests between freelancers and posters
  
  2. unlocks
    - id, note_id, freelancer_id, payment_status, created_at
    - Tracks paid unlocks after approval

  ## Updates to Existing Tables
  1. notes
    - Add daily_request_count, last_request_reset
  
  2. profiles
    - Add daily_request_limit, role, verified

  ## Security
  - RLS policies for all tables
  - Freelancers can only see their own requests
  - Posters can see requests for their notes
*/

-- Update notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS daily_request_count integer DEFAULT 0;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS last_request_reset timestamptz DEFAULT now();

-- Update profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_request_limit integer DEFAULT 10;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
ALTER TABLE profiles DROP COLUMN IF EXISTS updated_at;

-- Create connection_requests table
CREATE TABLE IF NOT EXISTS connection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
  freelancer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(note_id, freelancer_id)
);

ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;

-- Freelancers can view their own requests
CREATE POLICY "Freelancers can view own requests"
  ON connection_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = freelancer_id);

-- Posters can view requests for their notes
CREATE POLICY "Posters can view requests for their notes"
  ON connection_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = connection_requests.note_id
      AND notes.user_id = auth.uid()
    )
  );

-- Freelancers can create requests
CREATE POLICY "Freelancers can create requests"
  ON connection_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = freelancer_id);

-- Posters can update requests (approve/decline)
CREATE POLICY "Posters can update requests for their notes"
  ON connection_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = connection_requests.note_id
      AND notes.user_id = auth.uid()
    )
  );

-- Create unlocks table
CREATE TABLE IF NOT EXISTS unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
  freelancer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'failed')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(note_id, freelancer_id)
);

ALTER TABLE unlocks ENABLE ROW LEVEL SECURITY;

-- Freelancers can view their own unlocks
CREATE POLICY "Freelancers can view own unlocks"
  ON unlocks FOR SELECT
  TO authenticated
  USING (auth.uid() = freelancer_id);

-- Posters can view unlocks for their notes
CREATE POLICY "Posters can view unlocks for their notes"
  ON unlocks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = unlocks.note_id
      AND notes.user_id = auth.uid()
    )
  );

-- Freelancers can create unlocks
CREATE POLICY "Freelancers can create unlocks"
  ON unlocks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = freelancer_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_connection_requests_note ON connection_requests(note_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_freelancer ON connection_requests(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_status ON connection_requests(status);
CREATE INDEX IF NOT EXISTS idx_unlocks_note ON unlocks(note_id);
CREATE INDEX IF NOT EXISTS idx_unlocks_freelancer ON unlocks(freelancer_id);

-- Drop old unlocked_leads table if it exists
DROP TABLE IF EXISTS unlocked_leads CASCADE;
