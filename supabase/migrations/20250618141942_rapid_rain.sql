-- Migration: fix_overlapping_policies.sql
-- Fix overlapping RLS policies without recreating existing policies

BEGIN;

-- =============================================
-- Fix collage_settings table policies
-- =============================================
-- Drop only the overlapping policy
DROP POLICY IF EXISTS "Anyone can view collage settings" ON collage_settings;

-- Keep the comprehensive policy that already exists
-- This avoids recreating policies that might cause conflicts

-- =============================================
-- Fix photos table policies
-- =============================================
-- Drop only the overlapping policy
DROP POLICY IF EXISTS "Anyone can view photos" ON photos;

-- Keep the comprehensive policy that already exists
-- This avoids recreating policies that might cause conflicts

-- =============================================
-- Fix user_roles table policies
-- =============================================
-- Drop the overlapping policies, but check if they exist first
DO $$
DECLARE
  policy_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles' 
    AND policyname = 'Users can view their own roles'
  ) INTO policy_exists;
  
  IF policy_exists THEN
    EXECUTE 'DROP POLICY "Users can view their own roles" ON user_roles';
  END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles' 
    AND policyname = 'Admins can view all user roles'
  ) INTO policy_exists;
  
  IF policy_exists THEN
    EXECUTE 'DROP POLICY "Admins can view all user roles" ON user_roles';
  END IF;
  
  -- Only create the policy if it doesn't already exist
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles' 
    AND policyname = 'user_roles_select_policy'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    EXECUTE 'CREATE POLICY "user_roles_select_policy"
      ON user_roles
      FOR SELECT
      TO authenticated
      USING (
        -- Users can see their own roles OR admins can see all roles
        user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM user_roles admin_role
          WHERE admin_role.user_id = auth.uid()
          AND admin_role.role = ''admin''
        )
      )';
  END IF;
END $$;

-- =============================================
-- Fix settings table policies
-- =============================================
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "settings_anon_select" ON settings;
DROP POLICY IF EXISTS "settings_authenticated_all" ON settings;
DROP POLICY IF EXISTS "settings_system_select" ON settings;

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

-- =============================================
-- Fix function search path issues
-- =============================================
-- Fix update_collage_settings_updated_at function
CREATE OR REPLACE FUNCTION update_collage_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix get_collages_with_photo_count function
CREATE OR REPLACE FUNCTION get_collages_with_photo_count()
RETURNS TABLE (
  id uuid,
  name text,
  code text,
  user_id uuid,
  created_at timestamptz,
  photo_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.code,
    c.user_id,
    c.created_at,
    COUNT(p.id)::bigint AS photo_count
  FROM 
    collages c
  LEFT JOIN 
    photos p ON c.id = p.collage_id
  GROUP BY 
    c.id
  ORDER BY 
    c.created_at DESC;
END;
$$;

-- Fix get_user_collages_with_photo_count function
CREATE OR REPLACE FUNCTION get_user_collages_with_photo_count(user_uuid uuid)
RETURNS TABLE (
  id uuid,
  name text,
  code text,
  user_id uuid,
  created_at timestamptz,
  photo_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.code,
    c.user_id,
    c.created_at,
    COUNT(p.id)::bigint AS photo_count
  FROM 
    collages c
  LEFT JOIN 
    photos p ON c.id = p.collage_id
  WHERE
    c.user_id = user_uuid
  GROUP BY 
    c.id
  ORDER BY 
    c.created_at DESC;
END;
$$;

-- Fix create_default_collage_settings function
CREATE OR REPLACE FUNCTION create_default_collage_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO collage_settings (collage_id, settings)
  VALUES (
    NEW.id,
    '{
      "gridSize": 200,
      "floorSize": 200,
      "gridColor": "#444444",
      "photoSize": 4.0,
      "floorColor": "#1A1A1A",
      "photoCount": 50,
      "wallHeight": 0,
      "gridEnabled": true,
      "gridOpacity": 1.0,
      "cameraHeight": 10,
      "floorEnabled": true,
      "floorOpacity": 0.8,
      "photoSpacing": 0,
      "cameraEnabled": true,
      "gridDivisions": 30,
      "animationSpeed": 50,
      "cameraDistance": 25,
      "emptySlotColor": "#1A1A1A",
      "floorMetalness": 0.7,
      "floorRoughness": 0.2,
      "spotlightAngle": 1.2566370614359172,
      "spotlightColor": "#ffffff",
      "spotlightCount": 2,
      "spotlightWidth": 1.8,
      "backgroundColor": "#000000",
      "gridAspectRatio": 1.77778,
      "spotlightHeight": 35,
      "animationEnabled": false,
      "animationPattern": "grid",
      "photoRotation": true,
      "floorReflectivity": 0.8,
      "spotlightDistance": 60,
      "spotlightPenumbra": 1.2,
      "backgroundGradient": false,
      "spotlightIntensity": 400.0,
      "cameraRotationSpeed": 0.2,
      "ambientLightIntensity": 0.3,
      "backgroundGradientEnd": "#1a1a1a",
      "cameraRotationEnabled": true,
      "backgroundGradientAngle": 180,
      "backgroundGradientStart": "#000000",
      "photoBrightness": 1.0,
      "patterns": {
        "grid": {
          "enabled": true,
          "animationSpeed": 1.0,
          "spacing": 0.1,
          "aspectRatio": 1.77778,
          "wallHeight": 0
        },
        "float": {
          "enabled": false,
          "animationSpeed": 1.0,
          "spacing": 0.1,
          "height": 30,
          "spread": 25
        },
        "wave": {
          "enabled": false,
          "animationSpeed": 1.0,
          "spacing": 0.15,
          "amplitude": 5,
          "frequency": 0.5
        },
        "spiral": {
          "enabled": false,
          "animationSpeed": 1.0,
          "spacing": 0.1,
          "radius": 15,
          "heightStep": 0.5
        }
      }
    }'::jsonb
  );
  RETURN NEW;
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix other functions conditionally
DO $$
DECLARE
  func_exists boolean;
BEGIN
  -- Fix sync_users function if it exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'sync_users' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) INTO func_exists;
  
  IF func_exists THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION sync_users()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $func$
      BEGIN
        INSERT INTO public.users (id, email, created_at)
        VALUES (NEW.id, NEW.email, COALESCE(NEW.created_at, now()))
        ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email;
        RETURN NEW;
      END;
      $func$';
  END IF;

  -- Fix update_user_roles_updated_at function if it exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_user_roles_updated_at' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) INTO func_exists;
  
  IF func_exists THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION update_user_roles_updated_at()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $func$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $func$';
  END IF;

  -- Fix ensure_score_multiples_of_100 function if it exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'ensure_score_multiples_of_100' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) INTO func_exists;
  
  IF func_exists THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION ensure_score_multiples_of_100()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $func$
      BEGIN
        IF NEW.score % 100 != 0 THEN
          RAISE EXCEPTION ''Score must be a multiple of 100'';
        END IF;
        RETURN NEW;
      END;
      $func$';
  END IF;

  -- Fix validate_schema_integrity function if it exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'validate_schema_integrity' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) INTO func_exists;
  
  IF func_exists THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION validate_schema_integrity()
      RETURNS TABLE (
        table_name text,
        status text,
        issue text
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $func$
      DECLARE
        required_tables text[] := ARRAY[''users'', ''user_roles'', ''collages'', ''photos''];
        t text;
      BEGIN
        -- Check required tables exist
        FOREACH t IN ARRAY required_tables
        LOOP
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = ''public'' AND table_name = t
          ) THEN
            table_name := t;
            status := ''MISSING'';
            issue := ''Table does not exist'';
            RETURN NEXT;
          ELSE
            table_name := t;
            status := ''OK'';
            issue := NULL;
            RETURN NEXT;
          END IF;
        END LOOP;
        
        -- Check RLS is enabled on all tables
        FOREACH t IN ARRAY required_tables
        LOOP
          IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = ''public'' AND table_name = t
          ) AND NOT EXISTS (
            SELECT 1 FROM pg_tables
            WHERE schemaname = ''public'' AND tablename = t AND rowsecurity = true
          ) THEN
            table_name := t;
            status := ''WARNING'';
            issue := ''Row Level Security not enabled'';
            RETURN NEXT;
          END IF;
        END LOOP;
        
        -- Specific check for users table
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = ''public'' AND table_name = ''users''
        ) THEN
          -- Check for required columns
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = ''public'' AND table_name = ''users'' AND column_name = ''id''
          ) THEN
            table_name := ''users'';
            status := ''ERROR'';
            issue := ''Missing id column'';
            RETURN NEXT;
          END IF;
          
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = ''public'' AND table_name = ''users'' AND column_name = ''email''
          ) THEN
            table_name := ''users'';
            status := ''ERROR'';
            issue := ''Missing email column'';
            RETURN NEXT;
          END IF;
        END IF;
      END;
      $func$';
  END IF;

  -- Fix handle_auth_user_created function if it exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_auth_user_created' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) INTO func_exists;
  
  IF func_exists THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION handle_auth_user_created()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $func$
      BEGIN
        -- Insert or update user in public schema
        INSERT INTO public.users (id, email, created_at)
        VALUES (NEW.id, NEW.email, COALESCE(NEW.created_at, now()))
        ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email;

        -- Add default user role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, ''user'')
        ON CONFLICT (user_id, role) DO NOTHING;

        RETURN NEW;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING ''Error in handle_auth_user_created: %'', SQLERRM;
        RETURN NEW;
      END;
      $func$';
  END IF;

  -- Fix handle_auth_user_updated function if it exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_auth_user_updated' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) INTO func_exists;
  
  IF func_exists THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION handle_auth_user_updated()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $func$
      BEGIN
        UPDATE public.users
        SET email = NEW.email
        WHERE id = NEW.id;

        RETURN NEW;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING ''Error in handle_auth_user_updated: %'', SQLERRM;
        RETURN NEW;
      END;
      $func$';
  END IF;
END $$;

COMMIT;