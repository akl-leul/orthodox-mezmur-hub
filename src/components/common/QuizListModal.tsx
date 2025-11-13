import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit, Eye, EyeOff } from "lucide-react";
import { Quiz, Question, Answer } from "@/types/quiz";

interface QuizListModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizzes: Quiz[];
  questions: Record<string, Question[]>;
  answers: Record<string, Answer[]>;
  expandedQuiz: string | null;
  onToggleQuizExpansion: (quizId: string) => void;
  onEditQuiz: (quiz: Quiz) => void;
  onDeleteQuiz: (id: string) => void;
  onTogglePublished: (quiz: Quiz) => void;
  onAddQuestion: (quizId: string) => void;
  onEditQuestion: (question: Question & { tempAnswers: Answer[] }) => void;
  onDeleteQuestion: (quizId: string, questionId: string) => void;
}

const QuizListModal: React.FC<QuizListModalProps> = ({
  isOpen,
  onClose,
  quizzes,
  questions,
  answers,
  expandedQuiz,
  onToggleQuizExpansion,
  onEditQuiz,
  onDeleteQuiz,
  onTogglePublished,
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Quizzes</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {quizzes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No quizzes created yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create your first quiz to get started!
              </p>
            </div>
          ) : (
            quizzes.map((quiz) => (
              <Card key={quiz.id} className="shadow-elegant hover-scale">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle>{quiz.title}</CardTitle>
                      {quiz.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {quiz.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {quiz.time_limit && (
                          <span>Time: {quiz.time_limit} min</span>
                        )}
                        <span>Passing: {quiz.passing_score}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditQuiz(quiz)}
                      >
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Published</Label>
                        <Switch
                          checked={quiz.published}
                          onCheckedChange={() => onTogglePublished(quiz)}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleQuizExpansion(quiz.id)}
                      >
                        {expandedQuiz === quiz.id ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-1" /> Hide
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-1" /> Questions
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteQuiz(quiz.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {expandedQuiz === quiz.id && (
                  <CardContent>
                    <div className="mt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-md font-semibold">
                          Questions for {quiz.title}
                        </h4>
                        <Button
                          onClick={() => onAddQuestion(quiz.id)}
                          size="sm"
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add Question
                        </Button>
                      </div>

                      {questions[quiz.id]?.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No questions added yet for this quiz.
                        </p>
                      )}
                      {questions[quiz.id]?.map((question) => (
                        <Card key={question.id} className="p-4">
                          <div>
                            <div className="flex items-center justify-between">
                              <h5 className="font-semibold">
                                {question.question} ({question.points} points)
                              </h5>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    onEditQuestion({
                                      ...question,
                                      tempAnswers: answers[question.id!] || [],
                                    });
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    onDeleteQuestion(quiz.id, question.id!)
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <ul className="list-disc pl-5 text-sm text-muted-foreground mt-2">
                              {answers[question.id!]?.map(
                                (answer) => (
                                  <li
                                    key={answer.id}
                                    className={
                                      answer.is_correct
                                        ? "font-medium text-green-600"
                                        : ""
                                    }
                                  >
                                    {answer.answer_text}{" "}
                                    {answer.is_correct && "(Correct)"}
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuizListModal;
