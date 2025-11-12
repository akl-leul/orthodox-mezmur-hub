import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Clock, CheckCircle } from "lucide-react";
import { useAchievements } from "@/hooks/useAchievements";

interface Quiz {
  id: string;
  title: string;
  time_limit: number | null;
  passing_score: number;
}

interface Question {
  id: string;
  question: string;
  question_order: number;
}

interface Answer {
  id: string;
  answer_text: string;
  is_correct: boolean;
}

const QuizTaking = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer[]>>({});
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState(Date.now());
  
  // Get user ID for achievement checking
  const [userId, setUserId] = useState<string | null>(null);
  const { checkAndAwardAchievement } = useAchievements(userId || undefined);

  useEffect(() => {
    if (quizId) {
      fetchQuiz();
    }
  }, [quizId]);

  useEffect(() => {
    if (quiz?.time_limit && timeLeft === null) {
      setTimeLeft(quiz.time_limit * 60); // Convert to seconds
    }

    if (timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);

      return () => clearInterval(timer);
    } else if (timeLeft === 0) {
      handleSubmit();
    }
  }, [quiz, timeLeft]);

  const fetchQuiz = async () => {
    try {
      // Get user session first
      const { data: session } = await supabase.auth.getSession();
      if (session.session?.user) {
        setUserId(session.session.user.id);
      }

      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", quizId)
        .eq("published", true)
        .single();

      if (quizError) throw quizError;
      setQuiz(quizData);

      const { data: questionsData, error: questionsError } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("question_order", { ascending: true });

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      // Fetch answers for all questions
      for (const question of questionsData || []) {
        const { data: answersData, error: answersError } = await supabase
          .from("quiz_answers")
          .select("*")
          .eq("question_id", question.id)
          .order("answer_order", { ascending: true });

        if (answersError) throw answersError;
        setAnswers((prev) => ({ ...prev, [question.id]: answersData || [] }));
      }
    } catch (error: any) {
      console.error("Failed to load quiz:", error);
      toast.error("Failed to load quiz");
      navigate("/quizzes");
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) {
        toast.error("Please sign in to submit");
        return;
      }

      // Calculate score
      let correctCount = 0;
      const answeredQuestions = Object.entries(userAnswers);

      for (const [questionId, answerId] of answeredQuestions) {
        const answer = answers[questionId]?.find((a) => a.id === answerId);
        if (answer?.is_correct) {
          correctCount++;
        }
      }

      const totalQuestions = questions.length;
      const score = Math.round((correctCount / totalQuestions) * 100);
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);

      console.log("Submitting quiz attempt:", {
        user_id: session.session.user.id,
        quiz_id: quizId,
        score,
        total_questions: totalQuestions,
        correct_answers: correctCount,
        time_taken: timeTaken,
      });

      // Save attempt
      let attemptData;
      const attemptError = await (async () => {
        try {
          const { data, error } = await supabase
            .from("user_quiz_attempts")
            .insert({
              user_id: session.session.user.id,
              quiz_id: quizId,
              score,
              total_questions: totalQuestions,
              correct_answers: correctCount,
              time_taken: timeTaken,
            })
            .select()
            .single();
          
          attemptData = data;
          return error;
        } catch (err) {
          return err;
        }
      })();

      if (attemptError) {
        console.error("Attempt insert error:", attemptError);
        
        // If it's a trigger-related error, try the safe function
        if (attemptError.message?.includes('missing FROM-clause entry for table') || 
            attemptError.message?.includes('uqa') ||
            attemptError.code === 'P0001') {
          console.log("Attempting to insert using safe function...");
          
          // Use the safe function that bypasses triggers
          const { data: safeData, error: safeError } = await supabase
            .rpc('insert_quiz_attempt_safe', {
              p_user_id: session.session.user.id,
              p_quiz_id: quizId,
              p_score: score,
              p_total_questions: totalQuestions,
              p_correct_answers: correctCount,
              p_time_taken: timeTaken,
            });
          
          if (safeError) {
            console.error("Safe insert failed:", safeError);
            throw safeError;
          }
          
          attemptData = safeData[0]; // RPC returns array
        } else {
          throw attemptError;
        }
      }

      console.log("Quiz attempt saved successfully:", attemptData);

      // Save individual answers
      const answersToInsert = answeredQuestions.map(([questionId, answerId]) => ({
        attempt_id: attemptData.id,
        question_id: questionId,
        answer_id: answerId,
        is_correct: answers[questionId]?.find((a) => a.id === answerId)?.is_correct || false,
      }));

      console.log("Saving answers:", answersToInsert);

      const { error: answersError } = await supabase
        .from("user_quiz_answers")
        .insert(answersToInsert);

      if (answersError) {
        console.error("Answers insert error:", answersError);
        throw answersError;
      }

      console.log("Quiz answers saved successfully");

      // Check for new achievements based on quiz points
      if (checkAndAwardAchievement && userId) {
        // Get user's total quiz points after this submission
        const { data: userAttempts } = await supabase
          .from("user_quiz_attempts")
          .select("quiz_id")
          .eq("user_id", userId);
        
        const totalQuizPoints = userAttempts?.length || 0;
        console.log("Checking achievements for quiz points:", totalQuizPoints);
        
        checkAndAwardAchievement('quiz_points', totalQuizPoints);
      }

      // Send email notification (make it non-blocking)
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, email")
            .eq("id", sessionData.session.user.id)
            .single();

          if (profile) {
            await supabase.functions.invoke("send-quiz-notification", {
              body: {
                email: profile.email,
                name: profile.name,
                quizTitle: quiz.title,
                score,
                passingScore: quiz.passing_score,
                totalQuestions,
                correctAnswers: correctCount,
              },
            });
          }
        }
      } catch (notificationError) {
        console.warn("Email notification failed:", notificationError);
        // Don't fail the submission if email fails
      }

      toast.success(`Quiz completed! Score: ${score}%`);
      navigate("/quizzes");
    } catch (error: any) {
      console.error("Quiz submission failed:", error);
      toast.error(`Failed to submit quiz: ${error.message || "Unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!quiz || questions.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">Loading quiz...</div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const currentAnswers = answers[currentQ.id] || [];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="container mx-auto py-8 px-4 pb-24 md:pb-8 max-w-3xl animate-fade-in">
      <Card className="shadow-elegant">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>{quiz.title}</CardTitle>
            {timeLeft !== null && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span>
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                </span>
              </div>
            )}
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            Question {currentQuestion + 1} of {questions.length}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">{currentQ.question}</h3>
            <RadioGroup
              value={userAnswers[currentQ.id] || ""}
              onValueChange={(value) =>
                setUserAnswers((prev) => ({ ...prev, [currentQ.id]: value }))
              }
            >
              {currentAnswers.map((answer) => (
                <div key={answer.id} className="flex items-center space-x-2 p-3 rounded hover:bg-muted">
                  <RadioGroupItem value={answer.id} id={answer.id} />
                  <Label htmlFor={answer.id} className="flex-1 cursor-pointer">
                    {answer.answer_text}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="flex justify-between gap-4">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
            >
              Previous
            </Button>
            {currentQuestion < questions.length - 1 ? (
              <Button onClick={() => setCurrentQuestion((prev) => prev + 1)}>Next</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Submit Quiz
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuizTaking;