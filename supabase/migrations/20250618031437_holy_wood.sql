/*
  # Add Collage Management Functions
  
  1. New Functions
    - `get_collages_with_photo_count`: Returns collages with photo counts
  
  2. Purpose
    - Improves dashboard performance by fetching photo counts in a single query
    - Provides better data for collage management UI
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