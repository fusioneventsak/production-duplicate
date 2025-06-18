/*
  # Fix collage code format constraint
  
  1. Changes
    - Temporarily removes the code format constraint
    - Updates existing codes to ensure they match the new format
    - Adds a new constraint allowing both 4-character and 8-character codes
    
  2. Approach
    - Uses a more cautious approach to avoid constraint violations
    - Handles existing data before applying new constraints
*/

-- First, completely remove the constraint without checking if it exists
ALTER TABLE collages DROP CONSTRAINT IF EXISTS code_format;

-- Make sure all codes are uppercase and at least 4 characters
UPDATE collages
SET code = UPPER(SUBSTRING(code || 'AAAA', 1, 4))
WHERE LENGTH(code) < 4 OR code != UPPER(code);

-- Ensure all codes are either exactly 4 or exactly 8 characters
UPDATE collages
SET code = CASE 
  WHEN LENGTH(code) < 8 AND LENGTH(code) > 4 THEN SUBSTRING(code, 1, 4)
  WHEN LENGTH(code) > 8 THEN SUBSTRING(code, 1, 8)
  ELSE code
END;

-- Add the new constraint after fixing all data
ALTER TABLE collages ADD CONSTRAINT code_format 
  CHECK (code ~ '^[A-Z0-9]{4}$' OR code ~ '^[A-Z0-9]{8}$');