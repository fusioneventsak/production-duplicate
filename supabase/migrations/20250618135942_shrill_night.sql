-- Migration: fix_multiple_permissive_policies.sql
-- Consolidate overlapping RLS policies for better performance

BEGIN;

-- 1. COLLAGE_SETTINGS TABLE
-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can manage collage settings" ON collage_settings;
DROP POLICY IF EXISTS "Anyone can view collage settings" ON collage_settings;
DROP POLICY IF EXISTS "Users can manage their collage settings" ON collage_settings;
DROP POLICY IF EXISTS "Users can manage own collage settings" ON collage_settings;
DROP POLICY IF EXISTS "Public can view collage settings" ON collage_settings;
DROP POLICY IF EXISTS "manage_own_collage_settings" ON collage_settings;
DROP POLICY IF EXISTS "view_collage_settings" ON collage_settings;

-- Create single consolidated policy for SELECT (viewing)
CREATE POLICY "collage_settings_select_policy"
ON collage_settings
FOR SELECT
TO public
USING (true);

-- Create single consolidated policy for INSERT/UPDATE/DELETE (managing)
-- This maintains the same access pattern but consolidates into a single policy
CREATE POLICY "collage_settings_modify_policy"
ON collage_settings
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 2. PHOTOS TABLE
-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can manage photos" ON photos;
DROP POLICY IF EXISTS "Anyone can view photos" ON photos;  
DROP POLICY IF EXISTS "Users can view photos from own collages" ON photos;
DROP POLICY IF EXISTS "Users can add photos to own collages" ON photos;
DROP POLICY IF EXISTS "Users can update photos in own collages" ON photos;
DROP POLICY IF EXISTS "Users can delete photos from own collages" ON photos;
DROP POLICY IF EXISTS "Anyone can add photos to collages" ON photos;

-- Create single consolidated policy for SELECT (viewing)
CREATE POLICY "photos_select_policy"
ON photos
FOR SELECT
TO public
USING (true);

-- Create single consolidated policy for INSERT/UPDATE/DELETE (managing)
CREATE POLICY "photos_modify_policy"
ON photos
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 3. SETTINGS TABLE
-- Drop existing overlapping policies
DROP POLICY IF EXISTS "Authenticated users can manage settings" ON settings;
DROP POLICY IF EXISTS "Public users can view settings" ON settings;

-- Create single consolidated policy for SELECT
CREATE POLICY "settings_select_policy"
ON settings
FOR SELECT
TO public
USING (true);

-- Create single policy for INSERT/UPDATE/DELETE
CREATE POLICY "settings_modify_policy"
ON settings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. USER_ROLES TABLE  
-- Drop existing overlapping policies
DROP POLICY IF EXISTS "Admins can view all user roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;

-- Create single consolidated policy for SELECT
CREATE POLICY "user_roles_select_policy"
ON user_roles
FOR SELECT
TO authenticated
USING (
  -- Users can see their own roles OR admins can see all roles
  user_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM user_roles admin_role
    WHERE admin_role.user_id = (SELECT auth.uid())
    AND admin_role.role = 'admin'
  )
);

COMMIT;