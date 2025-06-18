-- First, completely remove any existing constraint
ALTER TABLE collages DROP CONSTRAINT IF EXISTS code_format;

-- Create a temporary table to store valid codes
CREATE TEMPORARY TABLE valid_collage_codes AS
SELECT id, 
       CASE
         WHEN LENGTH(code) < 4 THEN RPAD(UPPER(code), 4, '0')
         WHEN LENGTH(code) > 4 AND LENGTH(code) < 8 THEN UPPER(SUBSTRING(code, 1, 4))
         WHEN LENGTH(code) > 8 THEN UPPER(SUBSTRING(code, 1, 8))
         ELSE UPPER(code)
       END AS fixed_code
FROM collages;

-- Update the collages table with the fixed codes
UPDATE collages
SET code = valid_collage_codes.fixed_code
FROM valid_collage_codes
WHERE collages.id = valid_collage_codes.id;

-- Add the constraint back
ALTER TABLE collages ADD CONSTRAINT code_format 
  CHECK (code ~ '^[A-Z0-9]{4}$' OR code ~ '^[A-Z0-9]{8}$');

-- Drop the temporary table
DROP TABLE valid_collage_codes;