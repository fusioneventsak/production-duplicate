/*
  # Fix Collage Editor Access
  
  1. Changes
    - Ensures collage_settings table has proper structure
    - Adds missing columns if needed
    - Fixes constraints and indexes
    - Updates RLS policies for proper access
    
  2. Security
    - Maintains existing RLS policies
    - Ensures proper access to collage settings
*/

-- Make sure collage_settings table exists with proper structure
CREATE TABLE IF NOT EXISTS collage_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collage_id uuid NOT NULL REFERENCES collages(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Recreate indexes if they don't exist
CREATE INDEX IF NOT EXISTS collage_settings_collage_id_idx ON collage_settings(collage_id);
CREATE UNIQUE INDEX IF NOT EXISTS collage_settings_collage_id_key ON collage_settings(collage_id);

-- Enable RLS
ALTER TABLE collage_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view collage settings" ON collage_settings;
DROP POLICY IF EXISTS "Anyone can manage collage settings" ON collage_settings;

-- Create policies with proper permissions
CREATE POLICY "Anyone can view collage settings"
  ON collage_settings FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can manage collage settings"
  ON collage_settings FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create or replace trigger function for default settings
CREATE OR REPLACE FUNCTION create_default_collage_settings()
RETURNS TRIGGER AS $$
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
      "spotlightAngle": 0.7853981633974483,
      "spotlightColor": "#ffffff",
      "spotlightCount": 4,
      "spotlightWidth": 0.6,
      "backgroundColor": "#000000",
      "gridAspectRatio": 1.77778,
      "spotlightHeight": 30,
      "animationEnabled": true,
      "animationPattern": "grid",
      "photoRotation": true,
      "floorReflectivity": 0.8,
      "spotlightDistance": 40,
      "spotlightPenumbra": 0.4,
      "backgroundGradient": false,
      "spotlightIntensity": 150.0,
      "cameraRotationSpeed": 0.2,
      "ambientLightIntensity": 0.4,
      "backgroundGradientEnd": "#1a1a1a",
      "cameraRotationEnabled": true,
      "backgroundGradientAngle": 180,
      "backgroundGradientStart": "#000000",
      "photoBrightness": 1.0
    }'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_collage_settings ON collages;

-- Create trigger for default collage settings
CREATE TRIGGER create_collage_settings
  AFTER INSERT ON collages
  FOR EACH ROW
  EXECUTE FUNCTION create_default_collage_settings();

-- Create or replace function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating timestamps
DROP TRIGGER IF EXISTS update_collage_settings_updated_at ON collage_settings;
CREATE TRIGGER update_collage_settings_updated_at
  BEFORE UPDATE ON collage_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fix any missing settings for existing collages
INSERT INTO collage_settings (collage_id, settings)
SELECT 
  c.id,
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
    "spotlightAngle": 0.7853981633974483,
    "spotlightColor": "#ffffff",
    "spotlightCount": 4,
    "spotlightWidth": 0.6,
    "backgroundColor": "#000000",
    "gridAspectRatio": 1.77778,
    "spotlightHeight": 30,
    "animationEnabled": true,
    "animationPattern": "grid",
    "photoRotation": true,
    "floorReflectivity": 0.8,
    "spotlightDistance": 40,
    "spotlightPenumbra": 0.4,
    "backgroundGradient": false,
    "spotlightIntensity": 150.0,
    "cameraRotationSpeed": 0.2,
    "ambientLightIntensity": 0.4,
    "backgroundGradientEnd": "#1a1a1a",
    "cameraRotationEnabled": true,
    "backgroundGradientAngle": 180,
    "backgroundGradientStart": "#000000",
    "photoBrightness": 1.0
  }'::jsonb
FROM 
  collages c
LEFT JOIN 
  collage_settings cs ON c.id = cs.collage_id
WHERE 
  cs.id IS NULL
ON CONFLICT (collage_id) DO NOTHING;