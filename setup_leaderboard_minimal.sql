-- Minimal Leaderboard Setup (Safe to run multiple times)
-- Run this in your Supabase SQL Editor

-- Step 1: Create the RPC function for leaderboard data
CREATE OR REPLACE FUNCTION public.get_leaderboard_data()
RETURNS TABLE (
  user_id UUID,
  total_points INTEGER,
  quiz_points INTEGER,
  achievement_points INTEGER,
  quizzes_completed INTEGER,
  average_score INTEGER,
  highest_score INTEGER,
  user_name TEXT,
  user_profile_pic TEXT
) 
LANGUAGE sql
SECURITY DEFINER -- This bypasses RLS
AS $$
SELECT 
  up.user_id,
  COALESCE(up.total_points, 0) as total_points,
  COALESCE(up.quiz_points, 0) as quiz_points,
  COALESCE(up.achievement_points, 0) as achievement_points,
  COALESCE(up.quizzes_completed, 0) as quizzes_completed,
  COALESCE(up.average_score, 0) as average_score,
  COALESCE(up.highest_score, 0) as highest_score,
  COALESCE(p.name, 'Unknown User') as user_name,
  p.profile_pic as user_profile_pic
FROM public.user_points up
JOIN public.profiles p ON up.user_id = p.id
WHERE up.quizzes_completed > 0
ORDER BY up.total_points DESC
LIMIT 50;
$$;

-- Step 2: Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_leaderboard_data() TO anon, authenticated;

-- Step 3: Test the function
SELECT 'Testing get_leaderboard_data function...' as status;
SELECT * FROM public.get_leaderboard_data() LIMIT 5;

-- Step 4: Show table counts for verification
SELECT 'user_quiz_attempts count:' as info, COUNT(*) as count FROM public.user_quiz_attempts
UNION ALL
SELECT 'user_points count:' as info, COUNT(*) as count FROM public.user_points
UNION ALL
SELECT 'profiles count:' as info, COUNT(*) as count FROM public.profiles;
