/*
  # Fix collage code format constraint
  
  1. Changes
    - Removes existing code_format constraint
    - Updates existing collage codes to ensure they match the new format
    - Adds a new constraint allowing both 4-character and 8-character codes
  
  2. Purpose
    - Support both legacy 8-character codes and new 4-character codes
    - Ensure all existing data complies with the new constraint
    - Maintain data integrity
*/

-- First, temporarily disable the constraint checking
SET session_replication_role = 'replica';

-- Drop the existing constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'code_format' AND conrelid = 'collages'::regclass
  ) THEN
    ALTER TABLE collages DROP CONSTRAINT code_format;
  END IF;
END $$;

-- Update any existing codes to ensure they match the new pattern
-- Convert any non-compliant codes to 4-character uppercase codes
UPDATE collages
SET code = UPPER(SUBSTRING(code, 1, 4))
WHERE code !~ '^[A-Z0-9]{4}$' AND code !~ '^[A-Z0-9]{8}$';

-- Make sure all codes are uppercase
UPDATE collages
SET code = UPPER(code);

-- Add the new constraint that allows both 4-character and 8-character codes
ALTER TABLE collages ADD CONSTRAINT code_format 
  CHECK (code ~ '^[A-Z0-9]{4}$' OR code ~ '^[A-Z0-9]{8}$');

-- Re-enable constraint checking
SET session_replication_role = 'origin';