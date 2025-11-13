-- Comprehensive Leaderboard Debug Script
-- Run this in Supabase SQL Editor to identify issues

-- Step 1: Check if user_quiz_attempts has data
SELECT '=== user_quiz_attempts Table ===' as debug_info;
SELECT COUNT(*) as total_attempts FROM public.user_quiz_attempts;

-- Show sample attempts
SELECT 'Sample attempts:' as debug_info;
SELECT user_id, quiz_id, score, total_questions, correct_answers, completed_at 
FROM public.user_quiz_attempts 
ORDER BY completed_at DESC 
LIMIT 5;

-- Step 2: Check if user_points table has data
SELECT '=== user_points Table ===' as debug_info;
SELECT COUNT(*) as total_user_points FROM public.user_points;

-- Show sample user_points
SELECT 'Sample user_points:' as debug_info;
SELECT user_id, quiz_points, achievement_points, total_points, quizzes_completed, average_score, highest_score, last_updated
FROM public.user_points 
ORDER BY total_points DESC 
LIMIT 5;

-- Step 3: Check if profiles table has data
SELECT '=== profiles Table ===' as debug_info;
SELECT COUNT(*) as total_profiles FROM public.profiles;

-- Show sample profiles with user_ids that have attempts
SELECT 'Profiles of users with attempts:' as debug_info;
SELECT DISTINCT p.id, p.name, p.profile_pic
FROM public.profiles p
WHERE p.id IN (SELECT DISTINCT user_id FROM public.user_quiz_attempts)
LIMIT 5;

-- Step 4: Test the RPC function directly
SELECT '=== Testing RPC Function ===' as debug_info;
SELECT * FROM public.get_leaderboard_data() LIMIT 5;

-- Step 5: Check if the RPC function exists and has correct permissions
SELECT '=== RPC Function Info ===' as debug_info;
SELECT 
  proname as function_name,
  pronargs as num_args,
  proargnames as arg_names,
  prosecdef as is_security_definer
FROM pg_proc 
WHERE proname = 'get_leaderboard_data';

-- Step 6: Check permissions on the function
SELECT '=== RPC Function Permissions ===' as debug_info;
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_routine_grants 
WHERE routine_name = 'get_leaderboard_data';

-- Step 7: Manual query to simulate what RPC should do
SELECT '=== Manual Leaderboard Query ===' as debug_info;
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
LIMIT 5;

-- Step 8: If user_points is empty, check if we need to populate it
SELECT '=== Check if user_points needs population ===' as debug_info;
SELECT 
  (SELECT COUNT(*) FROM public.user_quiz_attempts) as attempts_count,
  (SELECT COUNT(*) FROM public.user_points) as points_count;

-- Step 9: Show users who should be on leaderboard but might not be in user_points
SELECT '=== Users with attempts but no user_points ===' as debug_info;
SELECT 
  uqa.user_id,
  COUNT(*) as attempt_count,
  AVG(uqa.score) as avg_score,
  MAX(uqa.score) as max_score,
  p.name
FROM public.user_quiz_attempts uqa
JOIN public.profiles p ON uqa.user_id = p.id
LEFT JOIN public.user_points up ON uqa.user_id = up.user_id
WHERE up.user_id IS NULL
GROUP BY uqa.user_id, p.name
ORDER BY attempt_count DESC;
