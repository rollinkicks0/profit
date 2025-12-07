-- TEST: Check if sessions are actually being stored
-- Run this in Supabase SQL Editor to see if sessions exist

SELECT 
  id,
  shop,
  CASE 
    WHEN access_token IS NOT NULL THEN 'YES (hidden)'
    ELSE 'NO'
  END as has_token,
  scope,
  is_online,
  created_at,
  updated_at
FROM shopify_sessions
ORDER BY created_at DESC
LIMIT 10;

-- Also check RLS policies
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'shopify_sessions';

