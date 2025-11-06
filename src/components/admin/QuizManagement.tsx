import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Save, X } from "lucide-react";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  published: boolean;
  time_limit: number | null;
  passing_score: number;
}

interface Question {
  id: string;
  quiz_id: string;
  question: string;
  question_order: number;
  points: number;
}

interface Answer {
  id: string;
  question_id: string;
  answer_text: string;
  is_correct: boolean;
  answer_order: number;
}

export default function QuizManagement() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [editingQuiz, setEditingQuiz] = useState<string | null>(null);
  const [newQuiz, setNewQuiz] = useState({
    title: "",
    description: "",
    time_limit: "",
    passing_score: "70",
  });
  const [questions, setQuestions] = useState<Record<string, Question[]>>({});
  const [answers, setAnswers] = useState<Record<string, Answer[]>>({});
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuizzes(data || []);
    } catch (error: any) {
      toast.error("Failed to load quizzes");
    }
  };

  const fetchQuestions = async (quizId: string) => {
    try {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("question_order", { ascending: true });

      if (error) throw error;
      setQuestions((prev) => ({ ...prev, [quizId]: data || [] }));

      // Fetch answers for each question
      if (data) {
        for (const question of data) {
          fetchAnswers(question.id);
        }
      }
    } catch (error: any) {
      toast.error("Failed to load questions");
    }
  };

  const fetchAnswers = async (questionId: string) => {
    try {
      const { data, error } = await supabase
        .from("quiz_answers")
        .select("*")
        .eq("question_id", questionId)
        .order("answer_order", { ascending: true });

      if (error) throw error;
      setAnswers((prev) => ({ ...prev, [questionId]: data || [] }));
    } catch (error: any) {
      toast.error("Failed to load answers");
    }
  };

  const handleCreateQuiz = async () => {
    if (!newQuiz.title) {
      toast.error("Title is required");
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase.from("quizzes").insert({
        title: newQuiz.title,
        description: newQuiz.description || null,
        time_limit: newQuiz.time_limit ? parseInt(newQuiz.time_limit) : null,
        passing_score: parseInt(newQuiz.passing_score),
        created_by: session.session?.user.id,
      });

      if (error) throw error;
      toast.success("Quiz created");
      setNewQuiz({ title: "", description: "", time_limit: "", passing_score: "70" });
      fetchQuizzes();
    } catch (error: any) {
      toast.error("Failed to create quiz");
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!confirm("Delete this quiz and all its questions?")) return;

    try {
      const { error } = await supabase.from("quizzes").delete().eq("id", id);
      if (error) throw error;
      toast.success("Quiz deleted");
      fetchQuizzes();
    } catch (error: any) {
      toast.error("Failed to delete quiz");
    }
  };

  const handleTogglePublished = async (quiz: Quiz) => {
    try {
      const { error } = await supabase
        .from("quizzes")
        .update({ published: !quiz.published })
        .eq("id", quiz.id);

      if (error) throw error;
      toast.success(quiz.published ? "Quiz unpublished" : "Quiz published");
      fetchQuizzes();
    } catch (error: any) {
      toast.error("Failed to update quiz");
    }
  };

  const toggleQuizExpansion = (quizId: string) => {
    if (expandedQuiz === quizId) {
      setExpandedQuiz(null);
    } else {
      setExpandedQuiz(quizId);
      if (!questions[quizId]) {
        fetchQuestions(quizId);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Create New Quiz</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={newQuiz.title}
              onChange={(e) => setNewQuiz({ ...newQuiz, title: e.target.value })}
              placeholder="Quiz title..."
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={newQuiz.description}
              onChange={(e) => setNewQuiz({ ...newQuiz, description: e.target.value })}
              placeholder="Quiz description..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Time Limit (minutes)</Label>
              <Input
                type="number"
                value={newQuiz.time_limit}
                onChange={(e) => setNewQuiz({ ...newQuiz, time_limit: e.target.value })}
                placeholder="No limit"
              />
            </div>
            <div>
              <Label>Passing Score (%)</Label>
              <Input
                type="number"
                value={newQuiz.passing_score}
                onChange={(e) => setNewQuiz({ ...newQuiz, passing_score: e.target.value })}
                placeholder="70"
              />
            </div>
          </div>
          <Button onClick={handleCreateQuiz} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Create Quiz
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Existing Quizzes</h3>
        {quizzes.map((quiz) => (
          <Card key={quiz.id} className="shadow-elegant hover-scale">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle>{quiz.title}</CardTitle>
                  {quiz.description && (
                    <p className="text-sm text-muted-foreground mt-1">{quiz.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Published</Label>
                    <Switch
                      checked={quiz.published}
                      onCheckedChange={() => handleTogglePublished(quiz)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleQuizExpansion(quiz.id)}
                  >
                    {expandedQuiz === quiz.id ? "Hide" : "Edit"} Questions
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteQuiz(quiz.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            {expandedQuiz === quiz.id && (
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Questions management will be added here. For now, use direct database access to add questions and answers.
                </p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}