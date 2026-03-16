/* ─── User ──────────────────────────────────────────────────────────────── */

export interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface UserSettings {
  interviewer_voice: string;
  immersive_mode: boolean;
  allow_typing: boolean;
  response_time_limit: number;
}

/* ─── Template ─────────────────────────────────────────────────────────── */

export interface Template {
  id: number;
  name: string;
  job_title: string;
  experience_level: string;
  job_description: string | null;
  behavioral_q_count: number;
  probing_strength: string;
  question_difficulty: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateFormData {
  name: string;
  job_title: string;
  experience_level: string;
  job_description: string;
  behavioral_q_count: number;
  probing_strength: string;
  question_difficulty: string;
}

/* ─── Interview ────────────────────────────────────────────────────────── */

export interface InterviewQuestion {
  question_id: number;
  question_text: string;
  question_type: string;
  question_number: number;
  total_main_questions: number;
}

export interface InterviewStartResponse {
  interview_id: number;
  first_question: InterviewQuestion;
}

export interface NextQuestionResponse {
  next_question: InterviewQuestion | null;
  is_complete: boolean;
  interview_id: number;
}

export interface QuestionFeedback {
  question_id: number;
  question_text: string;
  question_type: string;
  response_text: string | null;
  score: number | null;
  feedback: string | null;
}

export interface InterviewFeedback {
  interview_id: number;
  template_name: string | null;
  job_title: string | null;
  overall_score: number;
  started_at: string;
  completed_at: string | null;
  strengths: string[];
  improvements: string[];
  questions: QuestionFeedback[];
}

export interface InterviewHistoryItem {
  id: number;
  template_name: string | null;
  job_title: string | null;
  status: string;
  overall_score: number | null;
  started_at: string;
  completed_at: string | null;
  question_count: number;
}
