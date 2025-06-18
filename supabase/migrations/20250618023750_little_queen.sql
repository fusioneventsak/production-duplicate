/*
  # Fix collage code format constraint
  
  1. Changes
    - Temporarily disables the constraint check
    - Updates any non-conforming codes to 4-digit format
    - Adds a new constraint allowing both 4-digit and 8-digit codes
*/

-- First, drop the existing constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'code_format' AND conrelid = 'collages'::regclass
  ) THEN
    ALTER TABLE collages DROP CONSTRAINT code_format;
  END IF;
END $$;

-- Update any existing codes that don't match either pattern
-- This ensures all rows will satisfy the new constraint
UPDATE collages
SET code = UPPER(SUBSTRING(code, 1, 4))
WHERE code !~ '^[A-Z0-9]{4}$' AND code !~ '^[A-Z0-9]{8}$';

-- Make sure all codes are uppercase
UPDATE collages
SET code = UPPER(code);

-- Add a new constraint that allows both 4-character and 8-character codes
ALTER TABLE collages ADD CONSTRAINT code_format 
  CHECK (code ~ '^[A-Z0-9]{4}$' OR code ~ '^[A-Z0-9]{8}$');