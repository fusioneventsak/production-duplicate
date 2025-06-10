/*
  # Enhanced Spotlight Settings
  
  1. Changes
    - Improves default spotlight positioning for better floor reflection
    - Increases spotlight width, height, distance, and intensity
    - Optimizes lighting for bird's eye camera views
    - Updates existing collage settings with enhanced values
  
  2. Benefits
    - Better visibility from all camera angles
    - Stronger, more visible floor reflections
    - Wider light coverage across the scene
    - Improved overall visual quality
*/

-- Update the default collage settings function with enhanced spotlight values
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
$$ language 'plpgsql';

-- Update existing collage settings with enhanced spotlight settings
-- This preserves existing floor material settings while enhancing spotlights
UPDATE collage_settings 
SET settings = settings || '{
  "spotlightAngle": 1.2566370614359172,
  "spotlightHeight": 35,
  "spotlightDistance": 60,
  "spotlightPenumbra": 1.2,
  "spotlightIntensity": 400.0,
  "spotlightWidth": 1.8
}'::jsonb
WHERE settings IS NOT NULL;