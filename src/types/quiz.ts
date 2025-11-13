export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  published: boolean;
  time_limit: number | null;
  passing_score: number;
}

export interface Question {
  id?: string; // id is optional for new questions
  quiz_id: string;
  question: string;
  question_order?: number; // order is optional for new questions
  points: number;
}

export interface Answer {
  id?: string; // id is optional for new answers
  question_id: string;
  answer_text: string;
  is_correct: boolean;
  answer_order?: number; // order is optional for new answers
}
