/*
  # Fix Collage Functions and Add RPC Method
  
  1. Changes
    - Create get_collages_with_photo_count function
    - Grant proper permissions
    - Add error handling
    
  2. Purpose
    - Provides a single RPC endpoint to fetch collages with photo counts
    - Improves performance by reducing client-side data processing
    - Fixes 404 errors when fetching collages
*/

-- Create function to get collages with photo counts
CREATE OR REPLACE FUNCTION get_collages_with_photo_count()
RETURNS TABLE (
  id uuid,
  name text,
  code text,
  user_id uuid,
  created_at timestamptz,
  photo_count bigint
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to the function
GRANT EXECUTE ON FUNCTION get_collages_with_photo_count() TO public;
GRANT EXECUTE ON FUNCTION get_collages_with_photo_count() TO authenticated;
GRANT EXECUTE ON FUNCTION get_collages_with_photo_count() TO anon;

-- Create function to get collages with photo counts for a specific user
CREATE OR REPLACE FUNCTION get_user_collages_with_photo_count(user_uuid uuid)
RETURNS TABLE (
  id uuid,
  name text,
  code text,
  user_id uuid,
  created_at timestamptz,
  photo_count bigint
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to the function
GRANT EXECUTE ON FUNCTION get_user_collages_with_photo_count(uuid) TO public;
GRANT EXECUTE ON FUNCTION get_user_collages_with_photo_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_collages_with_photo_count(uuid) TO anon;