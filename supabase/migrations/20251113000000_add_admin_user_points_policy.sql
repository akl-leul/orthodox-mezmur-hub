-- Add admin policy for user_points table to allow leaderboard functionality
CREATE POLICY "Admins can view all user points"
  ON public.user_points FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Also add admin policy for user_quiz_attempts to get fallback data
CREATE POLICY "Admins can view all quiz attempts"
  ON public.user_quiz_attempts FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
