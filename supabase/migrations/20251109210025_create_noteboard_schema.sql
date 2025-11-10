/*
  # Noteboard MVP Database Schema

  ## Overview
  This migration creates the core database structure for the Noteboard platform where clients post needs and vendors unlock contact details.

  ## New Tables

  ### 1. `profiles`
  User profile information extending Supabase auth.users
  - `id` (uuid, primary key, references auth.users)
  - `email` (text, not null)
  - `full_name` (text)
  - `user_type` (text, not null) - 'client' or 'vendor'
  - `phone` (text)
  - `company` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `notes`
  Client posts/notes displayed on the wall
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `title` (text, not null)
  - `description` (text, not null)
  - `category` (text, not null) - Design, Tech, Marketing, etc.
  - `location` (text)
  - `is_priority` (boolean, default false) - R10 priority boost
  - `color` (text, default '#FEF3C7') - Pastel color for card
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `unlocked_leads`
  Tracks which vendors unlocked which notes
  - `id` (uuid, primary key)
  - `note_id` (uuid, references notes)
  - `vendor_id` (uuid, references profiles)
  - `unlocked_at` (timestamptz)
  - `payment_amount` (decimal, default 10.00)

  ### 4. `payment_history`
  Transaction records for unlock payments
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `note_id` (uuid, references notes)
  - `amount` (decimal, not null)
  - `status` (text, not null) - 'pending', 'completed', 'failed'
  - `stripe_payment_id` (text)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Profiles: Users can read all profiles, update only their own
  - Notes: Everyone can read all notes, clients can create/update/delete their own
  - Unlocked leads: Vendors can read their own unlocked leads, create new unlocks
  - Payment history: Users can read their own payment history only
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  user_type text NOT NULL CHECK (user_type IN ('client', 'vendor')),
  phone text,
  company text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  location text,
  is_priority boolean DEFAULT false,
  color text DEFAULT '#FEF3C7',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unlocked_leads table
CREATE TABLE IF NOT EXISTS unlocked_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
  vendor_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  unlocked_at timestamptz DEFAULT now(),
  payment_amount decimal(10,2) DEFAULT 10.00,
  UNIQUE(note_id, vendor_id)
);

-- Create payment_history table
CREATE TABLE IF NOT EXISTS payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  note_id uuid REFERENCES notes(id) ON DELETE SET NULL,
  amount decimal(10,2) NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  stripe_payment_id text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unlocked_leads_vendor_id ON unlocked_leads(vendor_id);
CREATE INDEX IF NOT EXISTS idx_unlocked_leads_note_id ON unlocked_leads(note_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE unlocked_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Notes policies
CREATE POLICY "Anyone can view all notes"
  ON notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Clients can create notes"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'client'
    )
  );

CREATE POLICY "Clients can update their own notes"
  ON notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clients can delete their own notes"
  ON notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Unlocked leads policies
CREATE POLICY "Vendors can view their unlocked leads"
  ON unlocked_leads FOR SELECT
  TO authenticated
  USING (auth.uid() = vendor_id);

CREATE POLICY "Vendors can create unlocked leads"
  ON unlocked_leads FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = vendor_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'vendor'
    )
  );

-- Payment history policies
CREATE POLICY "Users can view their own payment history"
  ON payment_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create payment records"
  ON payment_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
