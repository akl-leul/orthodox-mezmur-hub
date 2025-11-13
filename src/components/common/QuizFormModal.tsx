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
import { Save, X } from "lucide-react";
import { Quiz } from "@/types/quiz";

interface QuizFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuiz?: Quiz; // Quiz data for editing
  onSave: (quizData: Omit<Quiz, 'id'>, isNew: boolean) => Promise<void>;
}

const QuizFormModal: React.FC<QuizFormModalProps> = ({
  isOpen,
  onClose,
  initialQuiz,
  onSave,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [passingScore, setPassingScore] = useState("70");

  useEffect(() => {
    if (isOpen) {
      if (initialQuiz) {
        // Editing existing quiz
        setTitle(initialQuiz.title);
        setDescription(initialQuiz.description || "");
        setTimeLimit(initialQuiz.time_limit?.toString() || "");
        setPassingScore(initialQuiz.passing_score.toString());
      } else {
        // Adding new quiz
        setTitle("");
        setDescription("");
        setTimeLimit("");
        setPassingScore("70");
      }
    }
  }, [isOpen, initialQuiz]);

  const handleSave = async () => {
    if (!title.trim()) {
      return;
    }

    const quizData: Omit<Quiz, 'id'> = {
      title: title.trim(),
      description: description.trim() || null,
      published: initialQuiz?.published || false,
      time_limit: timeLimit ? parseInt(timeLimit, 10) : null,
      passing_score: parseInt(passingScore, 10),
    };

    await onSave(quizData, !initialQuiz?.id);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {initialQuiz ? "Edit Quiz" : "Create New Quiz"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Quiz title..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Quiz description..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="time_limit">Time Limit (minutes)</Label>
              <Input
                id="time_limit"
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                placeholder="No limit"
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passing_score">Passing Score (%)</Label>
              <Input
                id="passing_score"
                type="number"
                value={passingScore}
                onChange={(e) => setPassingScore(e.target.value)}
                placeholder="70"
                min="0"
                max="100"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" /> Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            <Save className="h-4 w-4 mr-2" />{" "}
            {initialQuiz ? "Save Changes" : "Create Quiz"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuizFormModal;
