-- Fix quiz submission by dropping problematic triggers
-- This will temporarily disable the user_points functionality
-- until we can properly debug and fix the trigger issues

DROP TRIGGER IF EXISTS update_user_points_trigger ON public.user_quiz_attempts;
DROP FUNCTION IF EXISTS public.update_user_points();
DROP TRIGGER IF EXISTS update_total_points_on_achievement_trigger ON public.user_achievements;
DROP FUNCTION IF EXISTS public.update_total_points_on_achievement();

-- Note: user_points table remains but won't auto-update
-- Quiz submission should now work properly
