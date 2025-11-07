-- Create achievements table
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆',
  criteria_type TEXT NOT NULL, -- 'quiz_score', 'quiz_completion', 'streak', 'posts_read', etc.
  criteria_value INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_achievements table
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for achievements
CREATE POLICY "Achievements are viewable by everyone"
  ON public.achievements FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage achievements"
  ON public.achievements FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for user_achievements
CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view all user achievements"
  ON public.user_achievements FOR SELECT
  USING (true);

CREATE POLICY "System can award achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Insert default achievements
INSERT INTO public.achievements (title, description, icon, criteria_type, criteria_value, points) VALUES
  ('First Steps', 'Complete your first quiz', '🎯', 'quiz_completion', 1, 10),
  ('Quiz Master', 'Complete 10 quizzes', '🏆', 'quiz_completion', 10, 50),
  ('Perfect Score', 'Score 100% on any quiz', '⭐', 'quiz_score', 100, 25),
  ('High Achiever', 'Score above 90% on 5 quizzes', '🌟', 'quiz_high_score', 5, 40),
  ('Knowledge Seeker', 'Read 10 posts', '📚', 'posts_read', 10, 20),
  ('Avid Reader', 'Read 50 posts', '📖', 'posts_read', 50, 100),
  ('Community Member', 'Post 5 discussions', '💬', 'discussion_created', 5, 30),
  ('Engaged User', 'Comment on 10 discussions', '💭', 'discussion_comments', 10, 25);

-- Enable realtime for user_achievements
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_achievements;