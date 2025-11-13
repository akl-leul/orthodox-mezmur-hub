-- Fix Quiz Points Trigger - Run this in Supabase SQL Editor

-- First, drop the existing trigger and function
DROP TRIGGER IF EXISTS update_user_points_trigger ON public.user_quiz_attempts;
DROP FUNCTION IF EXISTS public.update_user_points();

-- Create a simplified, working function to update user points
CREATE OR REPLACE FUNCTION public.update_user_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate quiz points based on performance
  -- Base points: 1 point per quiz attempt
  -- Bonus points: 2 points for scores >= 70%, 3 points for scores >= 90%
  DECLARE
    quiz_points INTEGER;
    total_attempts INTEGER;
    avg_score INTEGER;
    highest_score INTEGER;
    achievement_points INTEGER;
  BEGIN
    
    -- Calculate quiz points for this attempt
    quiz_points := CASE 
      WHEN NEW.score >= 90 THEN 3
      WHEN NEW.score >= 70 THEN 2
      ELSE 1
    END;
    
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

-- Test the trigger with a sample insert (if you have test data)
-- Uncomment to test:
-- INSERT INTO public.user_quiz_attempts (user_id, quiz_id, score, total_questions, correct_answers, time_taken)
-- VALUES ('your-test-user-id', 'your-test-quiz-id', 85, 10, 8, 300);

-- Check if user_points table is being populated
SELECT 'Checking user_points table...' as status;
SELECT * FROM public.user_points LIMIT 5;

-- Show trigger info
SELECT 'Trigger information:' as status;
SELECT tgname, tgrelid::regclass, tgfoid::regproc 
FROM pg_trigger 
WHERE tgname = 'update_user_points_trigger';
