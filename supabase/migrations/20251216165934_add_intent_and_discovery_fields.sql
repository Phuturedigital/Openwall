/*
  # Add Intent and Discovery Fields to Profiles

  1. Changes
    - Add `intent` field to profiles table (required)
      - Values: 'offer_services' or 'post_request'
    - Add `discovery_preference` field (required)
      - Values: 'near_me', 'my_city', 'anywhere'
    - Add `service_category` field (optional, for service providers)
    - Add `services_offered` field (optional, array for tags/skills)
    - Add `work_mode` field (optional)
      - Values: 'on_site', 'remote', 'both', 'either'
    - Add `help_needed` field (optional, for clients)
    - Add `company_name` field (optional)
  
  2. Migration Safety
    - Uses IF NOT EXISTS checks
    - Default values provided for existing users
    - All new fields are nullable initially
*/

-- Add intent field (how user wants to use Openwall)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'intent'
  ) THEN
    ALTER TABLE profiles ADD COLUMN intent text DEFAULT 'offer_services';
  END IF;
END $$;

-- Add discovery preference field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'discovery_preference'
  ) THEN
    ALTER TABLE profiles ADD COLUMN discovery_preference text DEFAULT 'my_city';
  END IF;
END $$;

-- Add company name field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'company_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN company_name text;
  END IF;
END $$;

-- Add service category field (for service providers)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'service_category'
  ) THEN
    ALTER TABLE profiles ADD COLUMN service_category text;
  END IF;
END $$;

-- Add services offered field (array for tags/skills)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'services_offered'
  ) THEN
    ALTER TABLE profiles ADD COLUMN services_offered text[];
  END IF;
END $$;

-- Add work mode field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'work_mode'
  ) THEN
    ALTER TABLE profiles ADD COLUMN work_mode text;
  END IF;
END $$;

-- Add help needed field (for clients posting requests)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'help_needed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN help_needed text[];
  END IF;
END $$;
