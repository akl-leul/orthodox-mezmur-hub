import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Question, Answer } from "@/types/quiz";

interface QuestionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizId: string; // The ID of the quiz this question belongs to
  initialQuestion?: Question & { tempAnswers: Answer[] }; // Question data for editing
  onSave: (
    questionData: Question,
    answersData: Answer[],
    isNew: boolean,
  ) => Promise<void>;
}

const QuestionFormModal: React.FC<QuestionFormModalProps> = ({
  isOpen,
  onClose,
  quizId,
  initialQuestion,
  onSave,
}) => {
  const [questionText, setQuestionText] = useState("");
  const [points, setPoints] = useState<string>("1");
  const [answers, setAnswers] = useState<
    { id?: string; answer_text: string; is_correct: boolean; answer_order?: number }[]
  >([]);

  useEffect(() => {
    if (isOpen) {
      if (initialQuestion) {
        // Editing existing question
        setQuestionText(initialQuestion.question);
        setPoints(initialQuestion.points.toString());
        setAnswers(initialQuestion.tempAnswers);
      } else {
        // Adding new question
        setQuestionText("");
        setPoints("1");
        setAnswers([{ answer_text: "", is_correct: false }]);
      }
    }
  }, [isOpen, initialQuestion]);

  const handleAddAnswerField = () => {
    setAnswers((prev) => [...prev, { answer_text: "", is_correct: false }]);
  };

  const handleAnswerTextChange = (value: string, index: number) => {
    setAnswers((prev) => {
      const updatedAnswers = [...prev];
      updatedAnswers[index].answer_text = value;
      return updatedAnswers;
    });
  };

  const handleCorrectAnswerChange = (index: number, checked: boolean) => {
    setAnswers((prev) => {
      const updatedAnswers = [...prev];
      updatedAnswers[index].is_correct = checked;
      return updatedAnswers;
    });
  };

  const handleDeleteAnswerField = (index: number) => {
    if (answers.length === 1) {
      toast.error("A question must have at least one answer option.");
      return;
    }
    setAnswers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveQuestion = async () => {
    if (!questionText.trim()) {
      toast.error("Question text is required.");
      return;
    }
    const filteredAnswers = answers.filter((a) => a.answer_text.trim() !== "");
    if (filteredAnswers.length === 0) {
      toast.error("At least one answer option (with text) is required.");
      return;
    }
    if (!filteredAnswers.some((a) => a.is_correct)) {
      toast.error("At least one correct answer must be selected.");
      return;
    }

    const questionData: Question = {
      id: initialQuestion?.id, // Will be undefined for new questions
      quiz_id: quizId,
      question: questionText,
      points: parseInt(points, 10),
      question_order: initialQuestion?.question_order,
    };

    // Ensure answer_order is set for all answers before saving
    const answersDataWithOrder = filteredAnswers.map((answer, index) => ({
        ...answer,
        question_id: initialQuestion?.id || '', // Placeholder, will be updated after question insert
        answer_order: index + 1,
    }));


    await onSave(questionData, answersDataWithOrder, !initialQuestion?.id);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {initialQuestion ? "Edit Question" : "Add New Question"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="question-text">Question Text *</Label>
            <Textarea
              id="question-text"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Type your question here..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="points">Points</Label>
            <Input
              id="points"
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              min="1"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-base">Answers * (Select at least one correct)</Label>
            {answers.map((answer, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Input
                  value={answer.answer_text}
                  onChange={(e) =>
                    handleAnswerTextChange(e.target.value, index)
                  }
                  placeholder={`Answer ${index + 1}`}
                  className="flex-grow"
                />
                <Switch
                  checked={answer.is_correct}
                  onCheckedChange={(checked) =>
                    handleCorrectAnswerChange(index, checked)
                  }
                  id={`answer-correct-${index}`}
                />
                <Label htmlFor={`answer-correct-${index}`} className="shrink-0">
                  Correct
                </Label>
                {answers.length > 1 && (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDeleteAnswerField(index)}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddAnswerField}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-1" /> Add Answer Option
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" /> Cancel
          </Button>
          <Button onClick={handleSaveQuestion}>
            <Save className="h-4 w-4 mr-2" />{" "}
            {initialQuestion ? "Save Changes" : "Add Question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuestionFormModal;
