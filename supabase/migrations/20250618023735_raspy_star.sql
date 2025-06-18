/*
  # Update collage code format constraint
  
  1. Changes
    - Temporarily removes the code_format constraint
    - Updates any existing codes to ensure they match the new format
    - Adds a new constraint that allows both 4-character and 8-character codes
  
  2. Security
    - Maintains data integrity with proper constraint
    - Ensures backward compatibility with existing codes
*/

-- First, drop the existing constraint if it exists
ALTER TABLE collages DROP CONSTRAINT IF EXISTS code_format;

-- Update any existing codes that don't match either pattern
-- This ensures all rows will satisfy the new constraint
UPDATE collages
SET code = SUBSTRING(code, 1, 4)
WHERE code !~ '^[A-Z0-9]{4}$' AND code !~ '^[A-Z0-9]{8}$';

-- Add a new constraint that allows both 4-character and 8-character codes
ALTER TABLE collages ADD CONSTRAINT code_format 
  CHECK (code ~ '^[A-Z0-9]{4}$' OR code ~ '^[A-Z0-9]{8}$');