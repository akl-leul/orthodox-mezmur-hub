-- Run this SQL in your Supabase SQL editor to create the leaderboard function

-- Create a function that returns leaderboard data and bypasses RLS
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
  up.total_points,
  up.quiz_points,
  up.achievement_points,
  up.quizzes_completed,
  up.average_score,
  up.highest_score,
  p.name as user_name,
  p.profile_pic as user_profile_pic
FROM public.user_points up
JOIN public.profiles p ON up.user_id = p.id
WHERE up.quizzes_completed > 0
ORDER BY up.total_points DESC
LIMIT 50;
$$;

-- Grant execute permissions to everyone
GRANT EXECUTE ON FUNCTION public.get_leaderboard_data() TO anon, authenticated;

-- Also add a simple policy for user_quiz_attempts as fallback
CREATE POLICY "Enable read access for leaderboard" ON public.user_quiz_attempts
  FOR SELECT USING (true);
