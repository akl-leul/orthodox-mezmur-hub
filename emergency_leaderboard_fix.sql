-- Emergency Leaderboard Fix - Run this if users have points but aren't showing
-- This script will populate the user_points table from existing quiz attempts

-- Step 1: Clear any existing user_points data
DELETE FROM public.user_points;

-- Step 2: Populate user_points from all existing quiz attempts
INSERT INTO public.user_points (
  user_id,
  quiz_points,
  achievement_points,
  total_points,
  quizzes_completed,
  average_score,
  highest_score,
  last_updated
)
SELECT 
  uqa.user_id,
  -- Calculate quiz points based on performance
  COALESCE(SUM(
    CASE 
      WHEN uqa.score >= 90 THEN 3  -- Excellent score: 3x points
      WHEN uqa.score >= 70 THEN 2  -- Good score: 2x points
      ELSE 1                      -- Basic completion: 1 point
    END
  ), 0) as quiz_points,
  -- Achievement points (will be 0 for now)
  0 as achievement_points,
  -- Total points = quiz points + achievement points
  COALESCE(SUM(
    CASE 
      WHEN uqa.score >= 90 THEN 3
      WHEN uqa.score >= 70 THEN 2
      ELSE 1
    END
  ), 0) as total_points,
  COUNT(*) as quizzes_completed,
  COALESCE(AVG(uqa.score), 0) as average_score,
  COALESCE(MAX(uqa.score), 0) as highest_score,
  NOW() as last_updated
FROM public.user_quiz_attempts uqa
GROUP BY uqa.user_id
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Show the results
SELECT '=== Emergency Fix Results ===' as status;
SELECT COUNT(*) as populated_users FROM public.user_points;

-- Step 4: Show the populated data
SELECT '=== Populated User Points ===' as status;
SELECT 
  up.user_id,
  up.quiz_points,
  up.total_points,
  up.quizzes_completed,
  up.average_score,
  up.highest_score,
  p.name as user_name
FROM public.user_points up
JOIN public.profiles p ON up.user_id = p.id
ORDER BY up.total_points DESC
LIMIT 10;

-- Step 5: Test the leaderboard function
SELECT '=== Testing Leaderboard Function ===' as status;
SELECT * FROM public.get_leaderboard_data() LIMIT 5;

-- Step 6: If you need to add achievement points too, run this:
UPDATE public.user_points up
SET 
  achievement_points = (
    SELECT COALESCE(SUM(a.points), 0) 
    FROM public.user_achievements ua 
    JOIN public.achievements a ON ua.achievement_id = a.id 
    WHERE ua.user_id = up.user_id
  ),
  total_points = quiz_points + (
    SELECT COALESCE(SUM(a.points), 0) 
    FROM public.user_achievements ua 
    JOIN public.achievements a ON ua.achievement_id = a.id 
    WHERE ua.user_id = up.user_id
  ),
  last_updated = NOW();

-- Step 7: Final verification
SELECT '=== Final Leaderboard Data ===' as status;
SELECT 
  up.user_id,
  up.total_points,
  up.quiz_points,
  up.achievement_points,
  up.quizzes_completed,
  p.name as user_name
FROM public.user_points up
JOIN public.profiles p ON up.user_id = p.id
WHERE up.quizzes_completed > 0
ORDER BY up.total_points DESC
LIMIT 10;
