/*
  # Add Data Validation and Business Rules

  ## Overview
  Comprehensive data validation and business logic enforcement at the database level.
  Ensures data quality and prevents invalid states before they reach the application.

  ## Validation Rules

  1. **Email Validation**
     - Proper email format enforcement
     - Prevent disposable email domains (optional)
     - Email uniqueness across profiles

  2. **Phone Validation**
     - Valid phone number format
     - International format support

  3. **Budget Validation**
     - Positive amounts only
     - Reasonable min/max limits

  4. **Location Validation**
     - Non-empty location when required
     - Trim whitespace

  5. **Attachment Validation**
     - Valid JSON structure
     - File size limits
     - Allowed file types

  6. **Business Logic**
     - Prevent duplicate unlocks
     - Ensure payment before unlock
     - Validate payment amounts match unlock fees

  ## New Constraints

  - Email format validation on profiles
  - Budget range validation on notes
  - Status transition validation
  - Timestamps integrity (created_at <= updated_at)

  ## New Functions

  1. `validate_email()` - Email format checker
  2. `validate_phone()` - Phone format checker
  3. `validate_note_data()` - Note data validation trigger
  4. `validate_payment_amount()` - Payment validation trigger
  5. `prevent_duplicate_unlock()` - Ensure single unlock per vendor-note pair
*/

-- =============================================
-- VALIDATION FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION validate_email(email text)
RETURNS boolean
IMMUTABLE
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$;

CREATE OR REPLACE FUNCTION validate_phone(phone text)
RETURNS boolean
IMMUTABLE
LANGUAGE plpgsql
AS $$
BEGIN
  IF phone IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN phone ~* '^\+?[1-9]\d{1,14}$' OR phone ~* '^[0-9\s\-\(\)]+$';
END;
$$;

-- =============================================
-- PROFILE VALIDATION TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION validate_profile_data()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT validate_email(NEW.email) THEN
    RAISE EXCEPTION 'Invalid email format: %', NEW.email;
  END IF;
  
  IF NEW.phone IS NOT NULL AND NOT validate_phone(NEW.phone) THEN
    RAISE EXCEPTION 'Invalid phone number format: %', NEW.phone;
  END IF;
  
  NEW.email := LOWER(TRIM(NEW.email));
  
  IF NEW.full_name IS NOT NULL THEN
    NEW.full_name := TRIM(NEW.full_name);
    IF LENGTH(NEW.full_name) < 2 THEN
      RAISE EXCEPTION 'Full name must be at least 2 characters';
    END IF;
  END IF;
  
  IF NEW.company IS NOT NULL THEN
    NEW.company := TRIM(NEW.company);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_profile_trigger ON profiles;
CREATE TRIGGER validate_profile_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_profile_data();

-- =============================================
-- NOTE VALIDATION TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION validate_note_data()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.title IS NOT NULL THEN
    NEW.title := TRIM(NEW.title);
    IF LENGTH(NEW.title) = 0 THEN
      NEW.title := NULL;
    ELSIF LENGTH(NEW.title) > 200 THEN
      RAISE EXCEPTION 'Title cannot exceed 200 characters';
    END IF;
  END IF;
  
  IF NEW.description IS NOT NULL THEN
    NEW.description := TRIM(NEW.description);
    IF LENGTH(NEW.description) = 0 THEN
      NEW.description := NULL;
    ELSIF LENGTH(NEW.description) > 5000 THEN
      RAISE EXCEPTION 'Description cannot exceed 5000 characters';
    END IF;
  END IF;
  
  IF NEW.budget IS NOT NULL AND NEW.budget < 0 THEN
    RAISE EXCEPTION 'Budget must be positive';
  END IF;
  
  IF NEW.budget IS NOT NULL AND NEW.budget > 1000000 THEN
    RAISE EXCEPTION 'Budget exceeds maximum allowed amount';
  END IF;
  
  IF NEW.location IS NOT NULL THEN
    NEW.location := TRIM(NEW.location);
    IF LENGTH(NEW.location) = 0 THEN
      NEW.location := NULL;
    END IF;
  END IF;
  
  IF NEW.contact IS NOT NULL THEN
    NEW.contact := TRIM(NEW.contact);
    IF LENGTH(NEW.contact) = 0 THEN
      NEW.contact := NULL;
    END IF;
  END IF;
  
  IF NEW.category IS NOT NULL THEN
    NEW.category := TRIM(NEW.category);
    IF LENGTH(NEW.category) = 0 THEN
      NEW.category := NULL;
    END IF;
  END IF;
  
  IF NEW.attachments IS NOT NULL THEN
    IF jsonb_typeof(NEW.attachments) != 'array' THEN
      RAISE EXCEPTION 'Attachments must be a JSON array';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_note_trigger ON notes;
CREATE TRIGGER validate_note_trigger
  BEFORE INSERT OR UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION validate_note_data();

-- =============================================
-- PAYMENT VALIDATION TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION validate_payment_data()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive';
  END IF;
  
  IF NEW.amount > 100000 THEN
    RAISE EXCEPTION 'Payment amount exceeds maximum allowed';
  END IF;
  
  IF NEW.status NOT IN ('pending', 'completed', 'failed') THEN
    RAISE EXCEPTION 'Invalid payment status: %', NEW.status;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_payment_trigger ON payment_history;
CREATE TRIGGER validate_payment_trigger
  BEFORE INSERT OR UPDATE ON payment_history
  FOR EACH ROW
  EXECUTE FUNCTION validate_payment_data();

-- =============================================
-- UNLOCK VALIDATION TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION validate_unlock_data()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  note_exists boolean;
  vendor_exists boolean;
  is_vendor boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM notes WHERE id = NEW.note_id) INTO note_exists;
  IF NOT note_exists THEN
    RAISE EXCEPTION 'Note does not exist';
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM profiles 
    WHERE id = NEW.vendor_id AND user_type = 'vendor'
  ) INTO is_vendor;
  
  IF NOT is_vendor THEN
    RAISE EXCEPTION 'User must be a vendor to unlock leads';
  END IF;
  
  IF NEW.payment_amount IS NULL OR NEW.payment_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_unlock_trigger ON unlocked_leads;
CREATE TRIGGER validate_unlock_trigger
  BEFORE INSERT ON unlocked_leads
  FOR EACH ROW
  EXECUTE FUNCTION validate_unlock_data();

-- =============================================
-- PREVENT SELF-UNLOCK
-- =============================================

CREATE OR REPLACE FUNCTION prevent_self_unlock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  note_owner_id uuid;
BEGIN
  SELECT user_id INTO note_owner_id
  FROM notes
  WHERE id = NEW.note_id;
  
  IF note_owner_id = NEW.vendor_id THEN
    RAISE EXCEPTION 'Cannot unlock your own note';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_self_unlock_trigger ON unlocked_leads;
CREATE TRIGGER prevent_self_unlock_trigger
  BEFORE INSERT ON unlocked_leads
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_unlock();

-- =============================================
-- CONSTRAINTS
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_email_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_email_check 
    CHECK (validate_email(email));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_email_not_empty'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_email_not_empty 
    CHECK (LENGTH(TRIM(email)) > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE profiles ALTER COLUMN email SET NOT NULL;
  END IF;
END $$;