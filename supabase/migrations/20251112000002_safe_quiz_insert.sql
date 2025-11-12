-- Create a simple function to insert quiz attempts without triggers
CREATE OR REPLACE FUNCTION public.insert_quiz_attempt_safe(
  p_user_id UUID,
  p_quiz_id UUID,
  p_score INTEGER,
  p_total_questions INTEGER,
  p_correct_answers INTEGER,
  p_time_taken INTEGER
)
RETURNS TABLE(id UUID, completed_at TIMESTAMPTZ) AS $$
BEGIN
  -- Temporarily disable triggers
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
  RETURNING id, completed_at;
  
  -- Re-enable triggers
  SET session_replication_role = DEFAULT;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
