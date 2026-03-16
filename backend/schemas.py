from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# Auth

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    username: str
    created_at: datetime

    class Config:
        from_attributes = True


# User Settings

class UserSettingsOut(BaseModel):
    interviewer_voice: str = "browser"
    immersive_mode: bool = False
    allow_typing: bool = True
    response_time_limit: int = 120

    class Config:
        from_attributes = True


class UserSettingsUpdate(BaseModel):
    interviewer_voice: Optional[str] = None
    immersive_mode: Optional[bool] = None
    allow_typing: Optional[bool] = None
    response_time_limit: Optional[int] = None


# Templates

class TemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    job_title: str = Field(..., min_length=1, max_length=100)
    experience_level: str = Field(default="Entry")
    job_description: Optional[str] = None
    behavioral_q_count: int = Field(default=2, ge=1, le=5)
    probing_strength: str = Field(default="Off")
    question_difficulty: str = Field(default="Standard")


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    job_title: Optional[str] = None
    experience_level: Optional[str] = None
    job_description: Optional[str] = None
    behavioral_q_count: Optional[int] = Field(default=None, ge=1, le=5)
    probing_strength: Optional[str] = None
    question_difficulty: Optional[str] = None


class TemplateOut(BaseModel):
    id: int
    name: str
    job_title: str
    experience_level: str
    job_description: Optional[str] = None
    behavioral_q_count: int
    probing_strength: str
    question_difficulty: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Interviews

class InterviewStart(BaseModel):
    template_id: Optional[int] = None
    # Ad-hoc settings (used when no template_id provided)
    job_title: Optional[str] = None
    experience_level: Optional[str] = "Entry"
    job_description: Optional[str] = None
    behavioral_q_count: Optional[int] = 2
    probing_strength: Optional[str] = "Off"
    question_difficulty: Optional[str] = "Standard"


class QuestionOut(BaseModel):
    question_id: int
    question_text: str
    question_type: str
    question_number: int
    total_main_questions: int

    class Config:
        from_attributes = True


class InterviewStartResponse(BaseModel):
    interview_id: int
    first_question: QuestionOut


class ResponseSubmit(BaseModel):
    question_id: int
    response_text: str


class NextQuestionResponse(BaseModel):
    next_question: Optional[QuestionOut] = None
    is_complete: bool = False
    interview_id: int


class QuestionFeedback(BaseModel):
    question_id: int
    question_text: str
    question_type: str
    response_text: Optional[str] = None
    score: Optional[float] = None
    feedback: Optional[str] = None


class InterviewFeedback(BaseModel):
    interview_id: int
    template_name: Optional[str] = None
    job_title: Optional[str] = None
    overall_score: float
    started_at: datetime
    completed_at: Optional[datetime] = None
    strengths: List[str]
    improvements: List[str]
    questions: List[QuestionFeedback]


class InterviewHistoryItem(BaseModel):
    id: int
    template_name: Optional[str] = None
    job_title: Optional[str] = None
    status: str
    overall_score: Optional[float] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    question_count: int

    class Config:
        from_attributes = True


class TTSRequest(BaseModel):
    text: str
    voice: str = "alloy"
