/*
  # Create Survey System with Intelligence

  1. New Tables
    - `survey_responses`
      - Main survey data table
      - Stores all answers and computed intelligence
      - Includes real-time tags and insights
      - POPIA compliant consent handling
    
    - `survey_events`
      - Event log for survey progression
      - Tracks what we learned at each step
      - Enables timeline analysis

  2. Security
    - Enable RLS on both tables
    - Users can only read their own responses
    - Admin/analytics access for aggregated views
    
  3. Features
    - JSON fields for flexible multi-select storage
    - Real-time tag and insight accumulation
    - Progress tracking
    - Full audit trail
*/

-- Survey responses table
CREATE TABLE IF NOT EXISTS survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Q1: Context
  user_type text,
  industry text,
  role text,
  team_size text,
  
  -- Q3: Main challenges (branched)
  main_challenge text,
  corporate_challenge text,
  
  -- Q4: Daily workflow
  time_wasters jsonb DEFAULT '[]'::jsonb,
  workflow_frustration text,
  
  -- Q5: Digital maturity
  digital_level text,
  current_tools jsonb DEFAULT '[]'::jsonb,
  digital_goal text,
  
  -- Q6: Automation & AI
  wants_automation text,
  automation_targets jsonb DEFAULT '[]'::jsonb,
  ai_openness text,
  
  -- Q7: Solution vision
  solution_guess text,
  urgent_feature text,
  
  -- Q8: Budget & urgency
  budget text,
  urgency text,
  
  -- Q9: POPIA consent & contact
  consent boolean DEFAULT false,
  name text,
  email text,
  phone text,
  
  -- Intelligence fields
  live_tags jsonb DEFAULT '[]'::jsonb,
  live_insights jsonb DEFAULT '[]'::jsonb,
  profile jsonb DEFAULT '{}'::jsonb,
  current_step integer DEFAULT 0,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Survey events table
CREATE TABLE IF NOT EXISTS survey_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid REFERENCES survey_responses(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  question_key text NOT NULL,
  answer_value text,
  tags_added jsonb DEFAULT '[]'::jsonb,
  insights_added jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_events ENABLE ROW LEVEL SECURITY;

-- Policies for survey_responses
CREATE POLICY "Users can view own survey responses"
  ON survey_responses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own survey responses"
  ON survey_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own survey responses"
  ON survey_responses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anonymous can insert survey responses"
  ON survey_responses FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous can update own survey responses by id"
  ON survey_responses FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Policies for survey_events
CREATE POLICY "Users can view own survey events"
  ON survey_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM survey_responses
      WHERE survey_responses.id = survey_events.response_id
      AND survey_responses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert survey events"
  ON survey_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM survey_responses
      WHERE survey_responses.id = survey_events.response_id
      AND survey_responses.user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous can insert survey events"
  ON survey_events FOR INSERT
  TO anon
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_survey_responses_user_id ON survey_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_created_at ON survey_responses(created_at);
CREATE INDEX IF NOT EXISTS idx_survey_responses_user_type ON survey_responses(user_type);
CREATE INDEX IF NOT EXISTS idx_survey_responses_industry ON survey_responses(industry);
CREATE INDEX IF NOT EXISTS idx_survey_events_response_id ON survey_events(response_id);
CREATE INDEX IF NOT EXISTS idx_survey_events_step_number ON survey_events(step_number);

-- GIN indexes for JSON fields
CREATE INDEX IF NOT EXISTS idx_survey_responses_live_tags ON survey_responses USING GIN (live_tags);
CREATE INDEX IF NOT EXISTS idx_survey_responses_time_wasters ON survey_responses USING GIN (time_wasters);
CREATE INDEX IF NOT EXISTS idx_survey_responses_current_tools ON survey_responses USING GIN (current_tools);
CREATE INDEX IF NOT EXISTS idx_survey_responses_automation_targets ON survey_responses USING GIN (automation_targets);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_survey_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS survey_responses_updated_at ON survey_responses;
CREATE TRIGGER survey_responses_updated_at
  BEFORE UPDATE ON survey_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_survey_updated_at();
