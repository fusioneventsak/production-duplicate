/*
  # Update collage code format to 4 digits
  
  1. Changes
    - Modifies the code format constraint to allow 4-character codes
    - Preserves backward compatibility with existing 8-character codes
    - Updates the constraint to allow both formats
  
  2. Security
    - Maintains existing RLS policies
    - No changes to access control
*/

-- Drop the existing constraint if it exists
ALTER TABLE collages DROP CONSTRAINT IF EXISTS code_format;

-- Add a new constraint that allows both 4-character and 8-character codes
ALTER TABLE collages ADD CONSTRAINT code_format 
  CHECK (code ~ '^[A-Z0-9]{4}$' OR code ~ '^[A-Z0-9]{8}$');