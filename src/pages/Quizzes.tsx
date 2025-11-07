import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Clock, Trophy, Play } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { useAchievements } from "@/hooks/useAchievements";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  time_limit: number | null;
  passing_score: number;
  created_at: string;
}

interface UserAttempt {
  score: number;
  completed_at: string;
}

const Quizzes = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [userAttempts, setUserAttempts] = useState<Record<string, UserAttempt[]>>({});
  const { checkAndAwardAchievement } = useAchievements(session?.user.id);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    fetchQuizzes();
  }, [session]);

  const fetchQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuizzes(data || []);

      // Fetch user attempts if logged in
      if (session) {
        for (const quiz of data || []) {
          fetchUserAttempts(quiz.id);
        }
        
        // Check for quiz completion achievements
        const { data: attempts } = await supabase
          .from("user_quiz_attempts")
          .select("*")
          .eq("user_id", session.user.id);
        
        if (attempts) {
          await checkAndAwardAchievement("quiz_completion", attempts.length);
          
          const highScores = attempts.filter((a) => a.score >= 90).length;
          await checkAndAwardAchievement("quiz_high_score", highScores);
        }
      }
    } catch (error: any) {
      toast.error("Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAttempts = async (quizId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_quiz_attempts")
        .select("score, completed_at")
        .eq("quiz_id", quizId)
        .eq("user_id", session?.user.id)
        .order("completed_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        setUserAttempts((prev) => ({ ...prev, [quizId]: data }));
      }
    } catch (error: any) {
      console.error("Failed to load attempts", error);
    }
  };

  const handleStartQuiz = (quizId: string) => {
    if (!session) {
      toast.error("Please sign in to take quizzes");
      navigate("/auth");
      return;
    }
    navigate(`/quiz/${quizId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">Loading quizzes...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 pb-24 md:pb-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <Brain className="h-8 w-8 text-primary" />
        <h1 className="text-4xl font-bold">Knowledge Quizzes</h1>
      </div>

      {quizzes.length === 0 ? (
        <Card className="shadow-elegant">
          <CardContent className="py-12 text-center">
            <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No quizzes available yet. Check back soon!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => {
            const bestAttempt = userAttempts[quiz.id]?.[0];
            const hasPassed = bestAttempt && bestAttempt.score >= quiz.passing_score;

            return (
              <Card key={quiz.id} className="shadow-elegant hover-scale transition-smooth">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Brain className="h-6 w-6 text-primary" />
                    </div>
                    {hasPassed && (
                      <Badge variant="default" className="gap-1">
                        <Trophy className="h-3 w-3" />
                        Passed
                      </Badge>
                    )}
                  </div>
                  <CardTitle>{quiz.title}</CardTitle>
                  {quiz.description && (
                    <CardDescription>{quiz.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {quiz.time_limit && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{quiz.time_limit} min</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Trophy className="h-4 w-4" />
                        <span>Pass: {quiz.passing_score}%</span>
                      </div>
                    </div>

                    {bestAttempt && (
                      <div className="text-sm bg-muted p-2 rounded">
                        <p className="font-semibold">Best Score: {bestAttempt.score}%</p>
                      </div>
                    )}

                    <Button onClick={() => handleStartQuiz(quiz.id)} className="w-full gap-2">
                      <Play className="h-4 w-4" />
                      {bestAttempt ? "Retake Quiz" : "Start Quiz"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Quizzes;