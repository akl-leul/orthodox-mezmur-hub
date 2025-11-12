-- Update achievements to be based on quiz points thresholds only
-- Remove old performance-based achievements and create new points-based ones

-- Delete old achievements
DELETE FROM public.achievements WHERE criteria_type IN ('quiz_completion', 'quiz_score', 'quiz_high_score');

-- Insert new quiz points-based achievements
INSERT INTO public.achievements (title, description, icon, criteria_type, criteria_value, points) VALUES
('Quiz Beginner', 'Complete your first quiz and earn your first point!', '🌟', 'quiz_points', 1, 10),
('Quiz Learner', 'Complete 5 quizzes and earn 5 points!', '📚', 'quiz_points', 5, 25),
('Quiz Enthusiast', 'Complete 10 quizzes and earn 10 points!', '🎯', 'quiz_points', 10, 50),
('Quiz Expert', 'Complete 25 quizzes and earn 25 points!', '🏆', 'quiz_points', 25, 100),
('Quiz Master', 'Complete 50 quizzes and earn 50 points!', '👑', 'quiz_points', 50, 200),
('Quiz Champion', 'Complete 100 quizzes and earn 100 points!', '🏅', 'quiz_points', 100, 300),
('Quiz Legend', 'Complete 250 quizzes and earn 250 points!', '⭐', 'quiz_points', 250, 500),
('Quiz Immortal', 'Complete 500 quizzes and earn 500 points!', '💎', 'quiz_points', 500, 1000);
