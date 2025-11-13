-- Complete Quiz System Fix - Run this in Supabase SQL Editor

-- Step 1: Fix the safe insert function to also update user points
DROP FUNCTION IF EXISTS public.insert_quiz_attempt_safe;

CREATE OR REPLACE FUNCTION public.insert_quiz_attempt_safe(
  p_user_id UUID,
  p_quiz_id UUID,
  p_score INTEGER,
  p_total_questions INTEGER,
  p_correct_answers INTEGER,
  p_time_taken INTEGER
)
RETURNS TABLE(id UUID, completed_at TIMESTAMPTZ) AS $$
DECLARE
  attempt_id UUID;
  quiz_points INTEGER;
  total_attempts INTEGER;
  avg_score INTEGER;
  highest_score INTEGER;
  achievement_points INTEGER;
BEGIN
  -- Temporarily disable triggers to avoid conflicts
  SET session_replication_role = replica;
  
  -- Insert the quiz attempt
  INSERT INTO public.user_quiz_attempts (
    user_id,
    quiz_id,
    score,
    total_questions,
    correct_answers,
    time_taken,
    completed_at
  ) VALUES (
    p_user_id,
    p_quiz_id,
    p_score,
    p_total_questions,
    p_correct_answers,
    p_time_taken,
    NOW()
  )
  RETURNING id, completed_at INTO attempt_id, completed_at;
  
  -- Re-enable triggers
  SET session_replication_role = DEFAULT;
  
  -- Manually update user points since triggers were disabled
  -- Calculate quiz points based on performance
  quiz_points := CASE 
    WHEN p_score >= 90 THEN 3
    WHEN p_score >= 70 THEN 2
    ELSE 1
  END;
  
  -- Get current user stats including this new attempt
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN score >= 90 THEN 3
        WHEN score >= 70 THEN 2
        ELSE 1
      END
    ), 0),
    COUNT(*),
    COALESCE(AVG(score), 0),
    COALESCE(MAX(score), 0)
  INTO total_attempts, avg_score, highest_score
  FROM public.user_quiz_attempts 
  WHERE user_id = p_user_id;
  
  -- Get achievement points
  SELECT COALESCE(SUM(a.points), 0)
  INTO achievement_points
  FROM public.user_achievements ua 
  JOIN public.achievements a ON ua.achievement_id = a.id 
  WHERE ua.user_id = p_user_id;
  
  -- Insert or update user points
  INSERT INTO public.user_points (
    user_id,
    quiz_points,
    achievement_points,
    total_points,
    quizzes_completed,
    average_score,
    highest_score,
    last_updated
  ) VALUES (
    p_user_id,
    total_attempts,
    achievement_points,
    total_attempts + achievement_points,
    total_attempts,
    avg_score,
    highest_score,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    quiz_points = EXCLUDED.quiz_points,
    achievement_points = EXCLUDED.achievement_points,
    total_points = EXCLUDED.total_points,
    quizzes_completed = EXCLUDED.quizzes_completed,
    average_score = EXCLUDED.average_score,
    highest_score = EXCLUDED.highest_score,
    last_updated = EXCLUDED.last_updated;
  
  -- Return the attempt info
  RETURN QUERY SELECT attempt_id, completed_at;
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Fix the main trigger function as backup
DROP TRIGGER IF EXISTS update_user_points_trigger ON public.user_quiz_attempts;
DROP FUNCTION IF EXISTS public.update_user_points();

CREATE OR REPLACE FUNCTION public.update_user_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate quiz points based on performance
  DECLARE
    quiz_points INTEGER;
    total_attempts INTEGER;
    avg_score INTEGER;
    highest_score INTEGER;
    achievement_points INTEGER;
  BEGIN
    
    -- Get current user stats
    SELECT 
      COALESCE(SUM(
        CASE 
          WHEN score >= 90 THEN 3
          WHEN score >= 70 THEN 2
          ELSE 1
        END
      ), 0),
      COUNT(*),
      COALESCE(AVG(score), 0),
      COALESCE(MAX(score), 0)
    INTO total_attempts, avg_score, highest_score
    FROM public.user_quiz_attempts 
    WHERE user_id = NEW.user_id;
    
    -- Get achievement points
    SELECT COALESCE(SUM(a.points), 0)
    INTO achievement_points
    FROM public.user_achievements ua 
    JOIN public.achievements a ON ua.achievement_id = a.id 
    WHERE ua.user_id = NEW.user_id;
    
    -- Insert or update user points
    INSERT INTO public.user_points (
      user_id,
      quiz_points,
      achievement_points,
      total_points,
      quizzes_completed,
      average_score,
      highest_score,
      last_updated
    ) VALUES (
      NEW.user_id,
      total_attempts,
      achievement_points,
      total_attempts + achievement_points,
      total_attempts,
      avg_score,
      highest_score,
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      quiz_points = EXCLUDED.quiz_points,
      achievement_points = EXCLUDED.achievement_points,
      total_points = EXCLUDED.total_points,
      quizzes_completed = EXCLUDED.quizzes_completed,
      average_score = EXCLUDED.average_score,
      highest_score = EXCLUDED.highest_score,
      last_updated = EXCLUDED.last_updated;
    
    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_user_points_trigger
  AFTER INSERT ON public.user_quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_points();

-- Step 3: Create a function to recalculate all user points (for fixing existing data)
CREATE OR REPLACE FUNCTION public.recalculate_all_user_points()
RETURNS TABLE(user_id UUID, quiz_points INTEGER, total_points INTEGER) AS $$
BEGIN
  -- Drop existing user_points and recalculate
  DELETE FROM public.user_points;
  
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      uqa.user_id,
      COUNT(*) as quizzes_completed,
      COALESCE(SUM(
        CASE 
          WHEN uqa.score >= 90 THEN 3
          WHEN uqa.score >= 70 THEN 2
          ELSE 1
        END
      ), 0) as quiz_points,
      COALESCE(AVG(uqa.score), 0) as average_score,
      COALESCE(MAX(uqa.score), 0) as highest_score
    FROM public.user_quiz_attempts uqa
    GROUP BY uqa.user_id
  ),
  user_achievements AS (
    SELECT 
      ua.user_id,
      COALESCE(SUM(a.points), 0) as achievement_points
    FROM public.user_achievements ua
    JOIN public.achievements a ON ua.achievement_id = a.id
    GROUP BY ua.user_id
  )
  SELECT 
    us.user_id,
    us.quiz_points,
    (us.quiz_points + COALESCE(ua.achievement_points, 0)) as total_points
  FROM user_stats us
  LEFT JOIN user_achievements ua ON us.user_id = ua.user_id;
  
  -- Actually insert the recalculated data
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
    us.user_id,
    us.quiz_points,
    COALESCE(ua.achievement_points, 0),
    (us.quiz_points + COALESCE(ua.achievement_points, 0)),
    us.quizzes_completed,
    us.average_score,
    us.highest_score,
    NOW()
  FROM user_stats us
  LEFT JOIN user_achievements ua ON us.user_id = ua.user_id
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Test the system
SELECT 'Testing quiz system fixes...' as status;

-- Show current state
SELECT 'Current user_quiz_attempts count:' as info, COUNT(*) as count FROM public.user_quiz_attempts;
SELECT 'Current user_points count:' as info, COUNT(*) as count FROM public.user_points;

-- Test the recalculation function
SELECT 'Recalculating all user points...' as status;
SELECT * FROM public.recalculate_all_user_points() LIMIT 5;

-- Show final state
SELECT 'Final user_points data:' as status;
SELECT * FROM public.user_points LIMIT 5;

-- Grant execute permissions for the new functions
GRANT EXECUTE ON FUNCTION public.insert_quiz_attempt_safe TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_all_user_points TO authenticated;
