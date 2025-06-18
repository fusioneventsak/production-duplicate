-- Migration: fix_settings_policy_roles.sql
-- Fix overlapping policies by targeting specific roles

BEGIN;

-- Drop ALL existing policies on settings table
DROP POLICY IF EXISTS "settings_authenticated_policy" ON settings;
DROP POLICY IF EXISTS "settings_public_policy" ON settings;
DROP POLICY IF EXISTS "settings_unified_policy" ON settings;
DROP POLICY IF EXISTS "settings_comprehensive_policy" ON settings;
DROP POLICY IF EXISTS "settings_select_policy" ON settings;
DROP POLICY IF EXISTS "settings_modify_policy" ON settings;

-- Create separate policies for anonymous users (SELECT only)
CREATE POLICY "settings_anon_select"
ON settings
FOR SELECT
TO anon
USING (true);

-- Create separate policies for authenticated users (ALL operations)
CREATE POLICY "settings_authenticated_all"
ON settings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create policy for other system roles if needed
CREATE POLICY "settings_system_select"
ON settings
FOR SELECT
TO authenticator, dashboard_user
USING (true);

COMMIT;