-- Migration: fix_overlapping_policies_final.sql
-- Replace separate SELECT/MODIFY policies with single comprehensive policies

BEGIN;

-- 1. COLLAGE_SETTINGS TABLE
-- Drop the overlapping policies
DROP POLICY IF EXISTS "collage_settings_select_policy" ON collage_settings;
DROP POLICY IF EXISTS "collage_settings_modify_policy" ON collage_settings;

-- Create single comprehensive policy
CREATE POLICY "collage_settings_comprehensive_policy"
ON collage_settings
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 2. PHOTOS TABLE
-- Drop the overlapping policies
DROP POLICY IF EXISTS "photos_select_policy" ON photos;
DROP POLICY IF EXISTS "photos_modify_policy" ON photos;

-- Create single comprehensive policy
CREATE POLICY "photos_comprehensive_policy"
ON photos
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 3. SETTINGS TABLE
-- Drop the overlapping policies
DROP POLICY IF EXISTS "settings_select_policy" ON settings;
DROP POLICY IF EXISTS "settings_modify_policy" ON settings;

-- Create single comprehensive policy for public viewing
CREATE POLICY "settings_public_policy"
ON settings
FOR SELECT
TO public
USING (true);

-- Create single comprehensive policy for authenticated management
CREATE POLICY "settings_authenticated_policy"
ON settings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. USER_ROLES TABLE
-- No need to modify if already fixed in previous migration

COMMIT;