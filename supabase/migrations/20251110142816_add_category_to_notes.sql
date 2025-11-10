/*
  # Add Category Field to Notes

  ## Overview
  Add a category field to notes for better organization and color coding

  ## Changes
  1. Add category column to notes table
  2. Add index for category filtering
  3. Backfill existing notes with auto-detected categories

  ## Security
  - No RLS changes needed
  - Category is optional and auto-detected from content
*/

-- Add category column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notes' AND column_name = 'category'
  ) THEN
    ALTER TABLE notes ADD COLUMN category text;
  END IF;
END $$;

-- Add check constraint for valid categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'notes' AND constraint_name = 'notes_category_check'
  ) THEN
    ALTER TABLE notes ADD CONSTRAINT notes_category_check 
    CHECK (category IN ('design', 'writing', 'tech', 'marketing', 'development', 'consulting', 'other') OR category IS NULL);
  END IF;
END $$;

-- Add index for category filtering
CREATE INDEX IF NOT EXISTS idx_notes_category 
ON notes(category) 
WHERE category IS NOT NULL AND status = 'open';

-- Function to auto-detect category from text
CREATE OR REPLACE FUNCTION auto_detect_category(text_content text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  lower_text text;
BEGIN
  lower_text := LOWER(text_content);
  
  IF lower_text LIKE '%design%' OR lower_text LIKE '%logo%' OR lower_text LIKE '%brand%' THEN
    RETURN 'design';
  ELSIF lower_text LIKE '%write%' OR lower_text LIKE '%content%' OR lower_text LIKE '%article%' THEN
    RETURN 'writing';
  ELSIF lower_text LIKE '%tech%' OR lower_text LIKE '%software%' OR lower_text LIKE '%app%' THEN
    RETURN 'tech';
  ELSIF lower_text LIKE '%market%' OR lower_text LIKE '%social%' OR lower_text LIKE '%ads%' THEN
    RETURN 'marketing';
  ELSIF lower_text LIKE '%develop%' OR lower_text LIKE '%code%' OR lower_text LIKE '%website%' THEN
    RETURN 'development';
  ELSIF lower_text LIKE '%consult%' OR lower_text LIKE '%advice%' OR lower_text LIKE '%strategy%' THEN
    RETURN 'consulting';
  ELSE
    RETURN 'other';
  END IF;
END;
$$;

-- Trigger to auto-set category on insert/update
CREATE OR REPLACE FUNCTION auto_set_category()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.category IS NULL THEN
    NEW.category := auto_detect_category(NEW.body);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_set_category ON notes;
CREATE TRIGGER trigger_auto_set_category
  BEFORE INSERT OR UPDATE OF body ON notes
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_category();

-- Backfill existing notes with categories
UPDATE notes
SET category = auto_detect_category(body)
WHERE category IS NULL;