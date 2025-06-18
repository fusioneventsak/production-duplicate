-- Start transaction
BEGIN;

-- =============================================
-- Optimize user_roles table policies
-- =============================================
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON user_roles;

-- Create optimized policies
CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Admins can view all user roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = (SELECT auth.uid())
    AND ur.role = 'admin'
  ));

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Optimize users table policies
-- =============================================
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Auth can insert user profiles" ON users;

-- Create optimized policies
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Auth can insert user profiles"
  ON users FOR INSERT
  TO service_role
  WITH CHECK (true);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Optimize sound_settings table policies
-- =============================================
ALTER TABLE sound_settings DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own sound settings" ON sound_settings;

-- Create optimized policy
CREATE POLICY "Users can manage their own sound settings"
  ON sound_settings
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE sound_settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Optimize collages table policies
-- =============================================
ALTER TABLE collages DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can create collages" ON collages;
DROP POLICY IF EXISTS "Anyone can view collages" ON collages;
DROP POLICY IF EXISTS "Anyone can update collages" ON collages;
DROP POLICY IF EXISTS "Anyone can delete collages" ON collages;
DROP POLICY IF EXISTS "Users can view own collages" ON collages;
DROP POLICY IF EXISTS "Users can create collages" ON collages;
DROP POLICY IF EXISTS "Users can update own collages" ON collages;
DROP POLICY IF EXISTS "Users can delete own collages" ON collages;
DROP POLICY IF EXISTS "Anyone can view collages by code" ON collages;

-- Create consolidated policies
-- For public access
CREATE POLICY "Anyone can view collages"
  ON collages FOR SELECT
  TO public
  USING (true);

-- For anonymous creation
CREATE POLICY "Anyone can create collages"
  ON collages FOR INSERT
  TO public
  WITH CHECK (true);

-- For anonymous update
CREATE POLICY "Anyone can update collages"
  ON collages FOR UPDATE
  TO public
  USING (true);

-- For anonymous deletion
CREATE POLICY "Anyone can delete collages"
  ON collages FOR DELETE
  TO public
  USING (true);

ALTER TABLE collages ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Optimize photos table policies
-- =============================================
ALTER TABLE photos DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can add photos to collages" ON photos;
DROP POLICY IF EXISTS "Anyone can view photos" ON photos;
DROP POLICY IF EXISTS "Anyone can manage photos" ON photos;
DROP POLICY IF EXISTS "Users can view photos from own collages" ON photos;
DROP POLICY IF EXISTS "Users can add photos to own collages" ON photos;
DROP POLICY IF EXISTS "Users can update photos in own collages" ON photos;
DROP POLICY IF EXISTS "Users can delete photos from own collages" ON photos;
DROP POLICY IF EXISTS "photos_comprehensive_policy" ON photos;

-- Create consolidated policies
-- For public access
CREATE POLICY "Anyone can view photos"
  ON photos FOR SELECT
  TO public
  USING (true);

-- For public management (insert, update, delete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'photos' 
    AND policyname = 'photos_comprehensive_policy'
  ) THEN
    CREATE POLICY "photos_comprehensive_policy"
      ON photos FOR ALL
      TO public
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Optimize collage_settings table policies
-- =============================================
ALTER TABLE collage_settings DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can manage collage settings" ON collage_settings;
DROP POLICY IF EXISTS "Anyone can view collage settings" ON collage_settings;
DROP POLICY IF EXISTS "Users can manage their collage settings" ON collage_settings;
DROP POLICY IF EXISTS "Users can manage own collage settings" ON collage_settings;
DROP POLICY IF EXISTS "Public can view collage settings" ON collage_settings;
DROP POLICY IF EXISTS "manage_own_collage_settings" ON collage_settings;
DROP POLICY IF EXISTS "view_collage_settings" ON collage_settings;
DROP POLICY IF EXISTS "collage_settings_comprehensive_policy" ON collage_settings;

-- Create consolidated policies
-- For public viewing
CREATE POLICY "Anyone can view collage settings"
  ON collage_settings FOR SELECT
  TO public
  USING (true);

-- For public management
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'collage_settings' 
    AND policyname = 'collage_settings_comprehensive_policy'
  ) THEN
    CREATE POLICY "collage_settings_comprehensive_policy"
      ON collage_settings FOR ALL
      TO public
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE collage_settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Optimize settings table policies
-- =============================================
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public users can view settings" ON settings;
DROP POLICY IF EXISTS "Authenticated users can manage settings" ON settings;
DROP POLICY IF EXISTS "settings_anon_select" ON settings;
DROP POLICY IF EXISTS "settings_authenticated_all" ON settings;
DROP POLICY IF EXISTS "settings_system_select" ON settings;
DROP POLICY IF EXISTS "settings_unified_policy" ON settings;

-- Create separate policies for anonymous users (SELECT only)
CREATE POLICY "settings_anon_select"
ON settings FOR SELECT
TO anon
USING (true);

-- Create separate policies for authenticated users (ALL operations)
CREATE POLICY "settings_authenticated_all"
ON settings FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create policy for other system roles if needed
CREATE POLICY "settings_system_select"
ON settings FOR SELECT
TO authenticator, dashboard_user
USING (true);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Optimize stock_photos table policies
-- =============================================
ALTER TABLE stock_photos DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view stock photos" ON stock_photos;

-- Create optimized policy
CREATE POLICY "Anyone can view stock photos"
  ON stock_photos FOR SELECT
  TO public
  USING (true);

ALTER TABLE stock_photos ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Optimize images table policies
-- =============================================
ALTER TABLE images DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view images" ON images;
DROP POLICY IF EXISTS "Authenticated users can insert images" ON images;
DROP POLICY IF EXISTS "Authenticated users can update images" ON images;
DROP POLICY IF EXISTS "Authenticated users can delete images" ON images;

-- Create optimized policies
CREATE POLICY "Public can view images"
  ON images FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert images"
  ON images FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update images"
  ON images FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete images"
  ON images FOR DELETE
  TO authenticated
  USING (true);

ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Optimize high_scores table policies
-- =============================================
ALTER TABLE high_scores DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view high scores" ON high_scores;
DROP POLICY IF EXISTS "Anyone can insert high scores" ON high_scores;

-- Create optimized policies
CREATE POLICY "Anyone can view high scores"
  ON high_scores FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert high scores"
  ON high_scores FOR INSERT
  TO public
  WITH CHECK (true);

ALTER TABLE high_scores ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Optimize stickers table policies
-- =============================================
ALTER TABLE stickers DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view stickers" ON stickers;

-- Create optimized policy
CREATE POLICY "Anyone can view stickers"
  ON stickers FOR SELECT
  TO public
  USING (true);

ALTER TABLE stickers ENABLE ROW LEVEL SECURITY;

-- Commit transaction
COMMIT;