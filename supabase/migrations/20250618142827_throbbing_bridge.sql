-- Migration: everything_completely_open.sql
-- Make everything completely open access - anyone can do anything

BEGIN;

-- 1. COLLAGES TABLE - Drop everything and create single open policy
DROP POLICY IF EXISTS "Anyone can view collages" ON collages;
DROP POLICY IF EXISTS "Anyone can create collages" ON collages;
DROP POLICY IF EXISTS "Anyone can update collages" ON collages;
DROP POLICY IF EXISTS "Anyone can delete collages" ON collages;
DROP POLICY IF EXISTS "Anyone can view collages by code" ON collages;
DROP POLICY IF EXISTS "Users can create collages" ON collages;
DROP POLICY IF EXISTS "Users can view own collages" ON collages;
DROP POLICY IF EXISTS "Users can update own collages" ON collages;
DROP POLICY IF EXISTS "Users can delete own collages" ON collages;
DROP POLICY IF EXISTS "collages_photobooth_policy" ON collages;
DROP POLICY IF EXISTS "collages_open_access" ON collages;
DROP POLICY IF EXISTS "collages_comprehensive_policy" ON collages;
DROP POLICY IF EXISTS "collages_unified" ON collages;
DROP POLICY IF EXISTS "collages_final_policy" ON collages;

-- Single completely open policy for collages
CREATE POLICY "collages_completely_open" 
ON collages 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 2. PHOTOS TABLE - Drop everything and create single open policy
DROP POLICY IF EXISTS "Anyone can view photos" ON photos;
DROP POLICY IF EXISTS "Anyone can add photos to collages" ON photos;
DROP POLICY IF EXISTS "Anyone can manage photos" ON photos;
DROP POLICY IF EXISTS "Users can view photos from own collages" ON photos;
DROP POLICY IF EXISTS "Users can add photos to own collages" ON photos;
DROP POLICY IF EXISTS "Users can update photos in own collages" ON photos;
DROP POLICY IF EXISTS "Users can delete photos from own collages" ON photos;
DROP POLICY IF EXISTS "photos_comprehensive_policy" ON photos;
DROP POLICY IF EXISTS "photos_photobooth_policy" ON photos;
DROP POLICY IF EXISTS "photos_open_access" ON photos;
DROP POLICY IF EXISTS "photos_unified" ON photos;
DROP POLICY IF EXISTS "photos_final_policy" ON photos;

-- Single completely open policy for photos
CREATE POLICY "photos_completely_open" 
ON photos 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 3. COLLAGE_SETTINGS TABLE - Drop everything and create single open policy
DROP POLICY IF EXISTS "Anyone can view collage settings" ON collage_settings;
DROP POLICY IF EXISTS "Anyone can manage collage settings" ON collage_settings;
DROP POLICY IF EXISTS "Users can manage their collage settings" ON collage_settings;
DROP POLICY IF EXISTS "Users can manage their own collage settings" ON collage_settings;
DROP POLICY IF EXISTS "manage_own_collage_settings" ON collage_settings;
DROP POLICY IF EXISTS "view_collage_settings" ON collage_settings;
DROP POLICY IF EXISTS "collage_settings_select_policy" ON collage_settings;
DROP POLICY IF EXISTS "collage_settings_modify_policy" ON collage_settings;
DROP POLICY IF EXISTS "collage_settings_comprehensive_policy" ON collage_settings;
DROP POLICY IF EXISTS "collage_settings_photobooth_policy" ON collage_settings;
DROP POLICY IF EXISTS "collage_settings_open_access" ON collage_settings;
DROP POLICY IF EXISTS "collage_settings_unified" ON collage_settings;
DROP POLICY IF EXISTS "collage_settings_final_policy" ON collage_settings;

-- Single completely open policy for collage_settings
CREATE POLICY "collage_settings_completely_open" 
ON collage_settings 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 4. SETTINGS TABLE - Drop everything and create single open policy
DROP POLICY IF EXISTS "Public users can view settings" ON settings;
DROP POLICY IF EXISTS "Authenticated users can manage settings" ON settings;
DROP POLICY IF EXISTS "settings_authenticated_policy" ON settings;
DROP POLICY IF EXISTS "settings_public_policy" ON settings;
DROP POLICY IF EXISTS "settings_unified_policy" ON settings;
DROP POLICY IF EXISTS "settings_select_policy" ON settings;
DROP POLICY IF EXISTS "settings_modify_policy" ON settings;
DROP POLICY IF EXISTS "settings_comprehensive_policy" ON settings;
DROP POLICY IF EXISTS "settings_open_read" ON settings;
DROP POLICY IF EXISTS "settings_final_policy" ON settings;
DROP POLICY IF EXISTS "settings_anon_select" ON settings;
DROP POLICY IF EXISTS "settings_authenticated_all" ON settings;
DROP POLICY IF EXISTS "settings_system_select" ON settings;

-- Single completely open policy for settings
CREATE POLICY "settings_completely_open" 
ON settings 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 5. USER_ROLES TABLE - Drop everything and create single open policy
DROP POLICY IF EXISTS "Admins can view all user roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "user_roles_select_policy" ON user_roles;
DROP POLICY IF EXISTS "user_roles_comprehensive_policy" ON user_roles;
DROP POLICY IF EXISTS "user_roles_authenticated_only" ON user_roles;
DROP POLICY IF EXISTS "user_roles_auth_only_policy" ON user_roles;
DROP POLICY IF EXISTS "user_roles_unified" ON user_roles;
DROP POLICY IF EXISTS "user_roles_final_policy" ON user_roles;

-- Single completely open policy for user_roles
CREATE POLICY "user_roles_completely_open" 
ON user_roles 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 6. USERS TABLE - Drop everything and create single open policy
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Auth can insert user profiles" ON users;

-- Single completely open policy for users
CREATE POLICY "users_completely_open" 
ON users 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 7. SOUND_SETTINGS TABLE - Drop everything and create single open policy
DROP POLICY IF EXISTS "Users can manage their own sound settings" ON sound_settings;

-- Single completely open policy for sound_settings
CREATE POLICY "sound_settings_completely_open" 
ON sound_settings 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 8. IMAGES TABLE - Drop everything and create single open policy
DROP POLICY IF EXISTS "Public can view images" ON images;
DROP POLICY IF EXISTS "Authenticated users can insert images" ON images;
DROP POLICY IF EXISTS "Authenticated users can update images" ON images;
DROP POLICY IF EXISTS "Authenticated users can delete images" ON images;

-- Single completely open policy for images
CREATE POLICY "images_completely_open" 
ON images 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 9. HIGH_SCORES TABLE - Drop everything and create single open policy
DROP POLICY IF EXISTS "Anyone can view high scores" ON high_scores;
DROP POLICY IF EXISTS "Anyone can insert high scores" ON high_scores;

-- Single completely open policy for high_scores
CREATE POLICY "high_scores_completely_open" 
ON high_scores 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 10. STOCK_PHOTOS TABLE - Drop everything and create single open policy
DROP POLICY IF EXISTS "Anyone can view stock photos" ON stock_photos;

-- Single completely open policy for stock_photos
CREATE POLICY "stock_photos_completely_open" 
ON stock_photos 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 11. STICKERS TABLE - Drop everything and create single open policy
DROP POLICY IF EXISTS "Anyone can view stickers" ON stickers;

-- Single completely open policy for stickers
CREATE POLICY "stickers_completely_open" 
ON stickers 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- Make sure RLS is enabled on all tables (but with completely open policies)
ALTER TABLE collages ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE collage_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sound_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE high_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE stickers ENABLE ROW LEVEL SECURITY;

COMMIT;