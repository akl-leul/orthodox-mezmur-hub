-- Cleanup script for discussion policies
-- Run this BEFORE running the migration if you get duplicate policy errors

-- Drop all existing discussion policies
DROP POLICY IF EXISTS "Users can view all discussions" ON public.discussions;
DROP POLICY IF EXISTS "Users can create discussions" ON public.discussions;
DROP POLICY IF EXISTS "Users can update their own discussions" ON public.discussions;
DROP POLICY IF EXISTS "Users can delete their own discussions" ON public.discussions;
DROP POLICY IF EXISTS "Users can view approved discussions or their own" ON public.discussions;
DROP POLICY IF EXISTS "Authenticated users can create discussions" ON public.discussions;
DROP POLICY IF EXISTS "Users can update their own pending discussions" ON public.discussions;
DROP POLICY IF EXISTS "Admins can update any discussion" ON public.discussions;
DROP POLICY IF EXISTS "Admins can delete any discussion" ON public.discussions;

-- Verify all policies are dropped
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'discussions';
