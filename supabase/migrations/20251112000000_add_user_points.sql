-- Create user_points table to track cumulative points
CREATE TABLE public.user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_points INTEGER NOT NULL DEFAULT 0,
  achievement_points INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  quizzes_completed INTEGER NOT NULL DEFAULT 0,
  average_score INTEGER NOT NULL DEFAULT 0,
  highest_score INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_points
CREATE POLICY "Users can view their own points"
  ON public.user_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own points"
  ON public.user_points FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert user points"
  ON public.user_points FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to update user points after quiz completion
CREATE OR REPLACE FUNCTION public.update_user_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update user points
  INSERT INTO public.user_points (
    user_id,
    quiz_points,
    quizzes_completed,
    average_score,
    highest_score,
    total_points,
    last_updated
  )
  VALUES (
    NEW.user_id,
    (SELECT COALESCE(SUM(
      CASE 
        WHEN uqa.score >= 90 THEN qq.points * 3  -- Excellent score: 3x points
        WHEN uqa.score >= 70 THEN qq.points * 2  -- Good score: 2x points
        ELSE qq.points  -- Basic points
      END
    ), 0)
     FROM public.user_quiz_attempts uqa
     JOIN public.quiz_questions qq ON uqa.quiz_id = qq.quiz_id
     WHERE uqa.user_id = NEW.user_id),
    (SELECT COUNT(*) FROM public.user_quiz_attempts WHERE user_id = NEW.user_id),
    (SELECT COALESCE(AVG(score), 0) FROM public.user_quiz_attempts WHERE user_id = NEW.user_id),
    (SELECT COALESCE(MAX(score), 0) FROM public.user_quiz_attempts WHERE user_id = NEW.user_id),
    (SELECT COALESCE(SUM(
      CASE 
        WHEN uqa.score >= 90 THEN qq.points * 3
        WHEN uqa.score >= 70 THEN qq.points * 2
        ELSE qq.points
      END
    ), 0) + 
     (SELECT COALESCE(SUM(a.points), 0) 
      FROM public.user_achievements ua 
      JOIN public.achievements a ON ua.achievement_id = a.id 
      WHERE ua.user_id = NEW.user_id)
    ),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    quiz_points = EXCLUDED.quiz_points,
    quizzes_completed = EXCLUDED.quizzes_completed,
    average_score = EXCLUDED.average_score,
    highest_score = EXCLUDED.highest_score,
    total_points = EXCLUDED.total_points,
    last_updated = EXCLUDED.last_updated;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update user points after quiz attempt
CREATE TRIGGER update_user_points_trigger
  AFTER INSERT ON public.user_quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_points();

-- Create trigger to update total points after achievement earned
CREATE OR REPLACE FUNCTION public.update_total_points_on_achievement()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_points 
  SET total_points = quiz_points + (
    SELECT COALESCE(SUM(a.points), 0) 
    FROM public.user_achievements ua 
    JOIN public.achievements a ON ua.achievement_id = a.id 
    WHERE ua.user_id = NEW.user_id
  ),
  last_updated = NOW()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_total_points_on_achievement_trigger
  AFTER INSERT ON public.user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_total_points_on_achievement();

-- Enable realtime for user_points
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_points;
