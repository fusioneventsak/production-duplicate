-- Migration: fix_final_settings_policy.sql
-- Fix the last overlapping policy on settings table

BEGIN;

-- Drop the overlapping policies
DROP POLICY IF EXISTS "settings_authenticated_policy" ON settings;
DROP POLICY IF EXISTS "settings_public_policy" ON settings;

-- Create a single comprehensive policy for settings
CREATE POLICY "settings_unified_policy"
ON settings
FOR ALL
TO public
USING (true)  -- Everyone can SELECT settings
WITH CHECK (
  -- Only authenticated users can INSERT/UPDATE/DELETE
  auth.role() = 'authenticated'
);

COMMIT;