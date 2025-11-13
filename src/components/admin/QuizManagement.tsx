import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Edit } from "lucide-react";
import { Quiz, Question, Answer } from "@/types/quiz";

// Import the modal components
import QuestionFormModal from "@/components/common/QuestionFormModal";
import QuizFormModal from "@/components/common/QuizFormModal";
import QuizListModal from "@/components/common/QuizListModal";

export default function QuizManagement() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [editingQuiz, setEditingQuiz] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Record<string, Question[]>>({});
  const [answers, setAnswers] = useState<Record<string, Answer[]>>({});
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);

  // State for managing the QuestionFormModal
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [currentQuestionForModal, setCurrentQuestionForModal] = useState<
    (Question & { tempAnswers: Answer[] }) | undefined
  >(undefined);

  // State for managing the QuizFormModal
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [currentQuizForModal, setCurrentQuizForModal] = useState<Quiz | undefined>(undefined);

  // State for managing the QuizListModal
  const [showQuizListModal, setShowQuizListModal] = useState(false);

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
    } catch (error: unknown) {
      toast.error(
        `Failed to load quizzes: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
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
          fetchAnswers(question.id as string); // Cast to string as id is guaranteed for existing questions
        }
      }
    } catch (error: unknown) {
      toast.error(
        `Failed to load questions: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
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
    } catch (error: unknown) {
      toast.error(
        `Failed to load answers: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleCreateQuiz = async (quizData: Omit<Quiz, 'id'>, isNew: boolean) => {
    try {
      if (isNew) {
        const { data: session } = await supabase.auth.getSession();
        const { error } = await supabase.from("quizzes").insert({
          ...quizData,
          created_by: session.session?.user.id,
        });

        if (error) throw error;
        toast.success("Quiz created");
      } else {
        // Update existing quiz
        if (!currentQuizForModal?.id) {
          toast.error("Quiz ID is missing for update.");
          return;
        }
        const { error } = await supabase
          .from("quizzes")
          .update({
            title: quizData.title,
            description: quizData.description,
            time_limit: quizData.time_limit,
            passing_score: quizData.passing_score,
          })
          .eq("id", currentQuizForModal.id);

        if (error) throw error;
        toast.success("Quiz updated");
      }
      fetchQuizzes();
    } catch (error: unknown) {
      toast.error(
        `Failed to ${isNew ? 'create' : 'update'} quiz: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleAddQuestionFromModal = (quizId: string) => {
    setShowQuizListModal(false);
    setCurrentQuestionForModal(undefined);
    setShowQuestionModal(true);
    setExpandedQuiz(quizId);
  };

  const handleEditQuestionFromModal = (question: Question & { tempAnswers: Answer[] }) => {
    setShowQuizListModal(false);
    setCurrentQuestionForModal(question);
    setShowQuestionModal(true);
    setExpandedQuiz(question.quiz_id);
  };

  const handleEditQuiz = (quiz: Quiz) => {
    setShowQuizListModal(false);
    setCurrentQuizForModal(quiz);
    setShowQuizModal(true);
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!confirm("Delete this quiz and all its questions?")) return;

    try {
      const { error } = await supabase.from("quizzes").delete().eq("id", id);
      if (error) throw error;
      toast.success("Quiz deleted");
      fetchQuizzes();
    } catch (error: unknown) {
      toast.error(
        `Failed to delete quiz: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
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
    } catch (error: unknown) {
      toast.error(
        `Failed to update quiz: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleDeleteQuestion = async (quizId: string, questionId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this question and all its answers?",
      )
    ) {
      return;
    }
    try {
      // Supabase supports cascading deletes if configured, otherwise delete answers first
      const { error: answersError } = await supabase
        .from("quiz_answers")
        .delete()
        .eq("question_id", questionId);
      if (answersError) throw answersError;

      const { error: questionError } = await supabase
        .from("quiz_questions")
        .delete()
        .eq("id", questionId);
      if (questionError) throw questionError;

      toast.success("Question deleted successfully!");
      fetchQuestions(quizId);
    } catch (error: unknown) {
      console.error("Error deleting question:", error);
      toast.error(
        `Failed to delete question: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleAddAnswer = async (
    questionId: string,
    answerText: string,
    isCorrect: boolean,
  ) => {
    if (!answerText.trim()) {
      toast.error("Answer text cannot be empty.");
      return;
    }
    try {
      const { error } = await supabase.from("quiz_answers").insert({
        question_id: questionId,
        answer_text: answerText,
        is_correct: isCorrect,
        answer_order: (answers[questionId]?.length || 0) + 1,
      });

      if (error) throw error;
      toast.success("Answer added!");
      fetchAnswers(questionId);
    } catch (error: unknown) {
      console.error("Error adding answer:", error);
      toast.error(
        `Failed to add answer: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleUpdateAnswer = async (answer: Answer) => {
    if (!answer.answer_text.trim()) {
      toast.error("Answer text cannot be empty.");
      return;
    }
    try {
      const { error } = await supabase
        .from("quiz_answers")
        .update({
          answer_text: answer.answer_text,
          is_correct: answer.is_correct,
        })
        .eq("id", answer.id!); // answer.id will exist for update

      if (error) throw error;
      toast.success("Answer updated!");
      // setEditingAnswer(null); // This state is no longer used for inline editing
      fetchAnswers(answer.question_id);
    } catch (error: unknown) {
      console.error("Error updating answer:", error);
      toast.error(
        `Failed to update answer: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleDeleteAnswer = async (questionId: string, answerId: string) => {
    if (!confirm("Are you sure you want to delete this answer?")) {
      return;
    }
    try {
      const { error } = await supabase
        .from("quiz_answers")
        .delete()
        .eq("id", answerId);

      if (error) throw error;
      toast.success("Answer deleted!");
      fetchAnswers(questionId);
    } catch (error: unknown) {
      console.error("Error deleting answer:", error);
      toast.error(
        `Failed to delete answer: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleSaveQuestionFromModal = async (
    questionData: Question,
    answersData: Answer[],
    isNew: boolean,
  ) => {
    try {
      if (isNew) {
        // Add new question logic
        const { data: questionInsertData, error: questionInsertError } =
          await supabase
            .from("quiz_questions")
            .insert({
              quiz_id: questionData.quiz_id,
              question: questionData.question,
              points: questionData.points,
              question_order:
                (questions[questionData.quiz_id]?.length || 0) + 1,
            })
            .select()
            .single();

        if (questionInsertError) throw questionInsertError;

        const answersToInsert = answersData.map((answer, index) => ({
          question_id: questionInsertData.id as string, // Use the newly inserted question ID
          answer_text: answer.answer_text,
          is_correct: answer.is_correct,
          answer_order: index + 1,
        }));

        const { error: answersInsertError } = await supabase
          .from("quiz_answers")
          .insert(answersToInsert);

        if (answersInsertError) throw answersInsertError;

        toast.success("Question and answers added successfully!");
        fetchQuestions(questionData.quiz_id);
      } else {
        // Update existing question logic
        if (!questionData.id) {
          toast.error("Question ID is missing for update.");
          return;
        }

        const { error: questionUpdateError } = await supabase
          .from("quiz_questions")
          .update({
            question: questionData.question,
            points: questionData.points,
          })
          .eq("id", questionData.id);

        if (questionUpdateError) throw questionUpdateError;

        // Update existing answers and add new ones
        const existingAnswerIdsInDb = new Set(
          (answers[questionData.id!] || []).map((a) => a.id),
        );
        const answersToUpdate = answersData.filter(
          (a) => a.id && existingAnswerIdsInDb.has(a.id),
        );
        const answersToInsert = answersData.filter((a) => !a.id); // New answers without an ID

        // Perform updates for existing answers
        for (const answer of answersToUpdate) {
          const { error: answerUpdateError } = await supabase
            .from("quiz_answers")
            .update({
              answer_text: answer.answer_text,
              is_correct: answer.is_correct,
              answer_order: answer.answer_order,
            })
            .eq("id", answer.id!);
          if (answerUpdateError) throw answerUpdateError;
        }

        // Perform inserts for new answers
        if (answersToInsert.length > 0) {
          const answersInsertWithQuestionId = answersToInsert.map(
            (answer, index) => ({
              ...answer,
              question_id: questionData.id!, // Use the existing question ID
              answer_order:
                (answers[questionData.id!]?.length || 0) + index + 1, // Append to existing
            }),
          );
          const { error: newAnswersInsertError } = await supabase
            .from("quiz_answers")
            .insert(answersInsertWithQuestionId);
          if (newAnswersInsertError) throw newAnswersInsertError;
        }

        // Identify answers that were removed in the modal (present in DB but not in answersData)
        const answersInDb = answers[questionData.id!] || [];
        const answersInModalIds = new Set(
          answersData.map((a) => a.id).filter(Boolean),
        );
        const answersToDelete = answersInDb.filter(
          (a) => a.id && !answersInModalIds.has(a.id),
        );

        for (const answer of answersToDelete) {
          const { error: answerDeleteError } = await supabase
            .from("quiz_answers")
            .delete()
            .eq("id", answer.id!);
          if (answerDeleteError) throw answerDeleteError;
        }

        toast.success("Question and answers updated successfully!");
        fetchQuestions(questionData.quiz_id);
      }
    } catch (error: unknown) {
      console.error("Error saving question:", error);
      toast.error(
        `Failed to save question: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const toggleQuizExpansion = (quizId: string) => {
    if (expandedQuiz === quizId) {
      setExpandedQuiz(null);
    } else {
      setExpandedQuiz(quizId);
      if (!questions[quizId]) {
        fetchQuestions(quizId);
      } else {
        // If questions are already loaded, ensure answers are fetched for all of them
        questions[quizId].forEach((question) => {
          if (!answers[question.id!]) {
            // question.id will exist here
            fetchAnswers(question.id!);
          }
        });
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="shadow-elegant">
          <CardContent className="pt-6">
            <Button
              onClick={() => {
                setCurrentQuizForModal(undefined);
                setShowQuizModal(true);
              }}
              className="w-full"
              size="lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Quiz
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-elegant">
          <CardContent className="pt-6">
            <Button
              onClick={() => setShowQuizListModal(true)}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Edit className="h-4 w-4 mr-2" />
              Manage Existing Quizzes
            </Button>
          </CardContent>
        </Card>
      </div>
      <QuizListModal
        isOpen={showQuizListModal}
        onClose={() => setShowQuizListModal(false)}
        quizzes={quizzes}
        questions={questions}
        answers={answers}
        expandedQuiz={expandedQuiz}
        onToggleQuizExpansion={toggleQuizExpansion}
        onEditQuiz={handleEditQuiz}
        onDeleteQuiz={handleDeleteQuiz}
        onTogglePublished={handleTogglePublished}
        onAddQuestion={handleAddQuestionFromModal}
        onEditQuestion={handleEditQuestionFromModal}
        onDeleteQuestion={handleDeleteQuestion}
      />
      <QuizFormModal
        isOpen={showQuizModal}
        onClose={() => setShowQuizModal(false)}
        initialQuiz={currentQuizForModal}
        onSave={handleCreateQuiz}
      />
      <QuestionFormModal
        isOpen={showQuestionModal}
        onClose={() => setShowQuestionModal(false)}
        quizId={expandedQuiz || ""} // Pass the currently expanded quizId
        initialQuestion={currentQuestionForModal}
        onSave={handleSaveQuestionFromModal}
      />
    </div>
  );
}
