-- First, completely remove any existing constraint
ALTER TABLE collages DROP CONSTRAINT IF EXISTS code_format;

-- Print out the problematic codes for debugging
DO $$
DECLARE
  problem_code RECORD;
BEGIN
  FOR problem_code IN 
    SELECT id, code 
    FROM collages
    WHERE code !~ '^[A-Z0-9]{4}$' AND code !~ '^[A-Z0-9]{8}$'
  LOOP
    RAISE NOTICE 'Problem code found: % (ID: %)', problem_code.code, problem_code.id;
  END LOOP;
END $$;

-- Handle special characters by replacing them with alphanumeric characters
UPDATE collages
SET code = regexp_replace(code, '[^A-Za-z0-9]', '0', 'g');

-- Update all codes directly with a CASE expression
-- This handles all possible code formats in a single update
UPDATE collages
SET code = 
  CASE
    -- For codes shorter than 4 characters, pad with zeros
    WHEN LENGTH(code) < 4 THEN 
      RPAD(UPPER(code), 4, '0')
    
    -- For codes between 4-7 characters, keep only first 4
    WHEN LENGTH(code) > 4 AND LENGTH(code) < 8 THEN 
      UPPER(SUBSTRING(code, 1, 4))
    
    -- For codes longer than 8 characters, keep only first 8
    WHEN LENGTH(code) > 8 THEN 
      UPPER(SUBSTRING(code, 1, 8))
    
    -- For codes exactly 4 or 8 characters, just ensure uppercase
    ELSE 
      UPPER(code)
  END;

-- Handle any remaining problematic codes by forcing them to a valid format
UPDATE collages
SET code = 'CODE' || SUBSTRING(MD5(id::text), 1, 4)
WHERE code !~ '^[A-Z0-9]{4}$' AND code !~ '^[A-Z0-9]{8}$';

-- Verify all codes now match the pattern before adding constraint
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM collages
  WHERE code !~ '^[A-Z0-9]{4}$' AND code !~ '^[A-Z0-9]{8}$';
  
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'There are still % invalid codes after update', invalid_count;
  END IF;
END $$;

-- Now add the constraint back
ALTER TABLE collages ADD CONSTRAINT code_format 
  CHECK (code ~ '^[A-Z0-9]{4}$' OR code ~ '^[A-Z0-9]{8}$');