-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  published BOOLEAN NOT NULL DEFAULT false,
  time_limit INTEGER, -- in minutes, null means no limit
  passing_score INTEGER DEFAULT 70, -- percentage
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quiz_questions table
CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_order INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quiz_answers table (multiple choice)
CREATE TABLE public.quiz_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  answer_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_quiz_attempts table
CREATE TABLE public.user_quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL, -- percentage
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  time_taken INTEGER, -- in seconds
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_quiz_answers table (for tracking individual answers)
CREATE TABLE public.user_quiz_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.user_quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  answer_id UUID NOT NULL REFERENCES public.quiz_answers(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, success, warning, error
  read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Quizzes policies
CREATE POLICY "Published quizzes are viewable by everyone"
ON public.quizzes FOR SELECT
USING (published = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can manage quizzes"
ON public.quizzes FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Quiz questions policies (users can view questions when taking quiz)
CREATE POLICY "Quiz questions are viewable with published quiz"
ON public.quiz_questions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes
    WHERE quizzes.id = quiz_questions.quiz_id
    AND (quizzes.published = true OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Only admins can manage quiz questions"
ON public.quiz_questions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Quiz answers policies
CREATE POLICY "Quiz answers are viewable with published quiz"
ON public.quiz_answers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_questions
    JOIN public.quizzes ON quizzes.id = quiz_questions.quiz_id
    WHERE quiz_questions.id = quiz_answers.question_id
    AND (quizzes.published = true OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Only admins can manage quiz answers"
ON public.quiz_answers FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- User quiz attempts policies
CREATE POLICY "Users can view their own quiz attempts"
ON public.user_quiz_attempts FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can create quiz attempts"
ON public.user_quiz_attempts FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can view all attempts"
ON public.user_quiz_attempts FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- User quiz answers policies
CREATE POLICY "Users can view their own quiz answers"
ON public.user_quiz_answers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_quiz_attempts
    WHERE user_quiz_attempts.id = user_quiz_answers.attempt_id
    AND (user_quiz_attempts.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Authenticated users can create quiz answers"
ON public.user_quiz_answers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_quiz_attempts
    WHERE user_quiz_attempts.id = user_quiz_answers.attempt_id
    AND user_quiz_attempts.user_id = auth.uid()
  )
);

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can create notifications for any user"
ON public.notifications FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- Add triggers for timestamp updates
CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON public.quizzes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_quiz_attempts;