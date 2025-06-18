-- First, completely remove the constraint without checking if it exists
-- This avoids the error when the constraint is violated
ALTER TABLE collages DROP CONSTRAINT IF EXISTS code_format;

-- Fix any existing data to ensure it will satisfy our new constraint
-- First, make all codes uppercase
UPDATE collages SET code = UPPER(code);

-- Then ensure all codes are either 4 or 8 characters
-- For any that don't match, pad or truncate to 4 characters
UPDATE collages 
SET code = CASE
  WHEN LENGTH(code) < 4 THEN RPAD(code, 4, '0')  -- Pad short codes with zeros
  WHEN LENGTH(code) > 4 AND LENGTH(code) < 8 THEN SUBSTRING(code, 1, 4)  -- Truncate to 4 if between 4-8
  WHEN LENGTH(code) > 8 THEN SUBSTRING(code, 1, 8)  -- Truncate to 8 if longer
  ELSE code  -- Keep as is if already 4 or 8 characters
END
WHERE LENGTH(code) != 4 AND LENGTH(code) != 8;

-- Now add the constraint back
ALTER TABLE collages ADD CONSTRAINT code_format 
  CHECK (code ~ '^[A-Z0-9]{4}$' OR code ~ '^[A-Z0-9]{8}$');