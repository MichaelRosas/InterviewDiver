from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Boolean, Float, Text, DateTime, ForeignKey, Enum
)
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))

    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    templates = relationship("Template", back_populates="user", cascade="all, delete-orphan")
    interviews = relationship("Interview", back_populates="user", cascade="all, delete-orphan")


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    interviewer_voice = Column(String(50), default="browser")  # off, browser, alloy, echo, fable, onyx, nova, shimmer
    immersive_mode = Column(Boolean, default=False)
    allow_typing = Column(Boolean, default=True)
    response_time_limit = Column(Integer, default=120)  # seconds

    user = relationship("User", back_populates="settings")


class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    job_title = Column(String(100), nullable=False)
    experience_level = Column(String(20), nullable=False, default="Entry")  # Entry, Mid, Senior
    job_description = Column(Text, nullable=True)
    behavioral_q_count = Column(Integer, default=2)  # 1-5
    probing_strength = Column(String(20), default="Off")  # Off, Low, Medium, High
    question_difficulty = Column(String(20), default="Standard")  # Standard, Challenging
    created_at = Column(DateTime, default=datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    user = relationship("User", back_populates="templates")
    interviews = relationship("Interview", back_populates="template")


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("templates.id"), nullable=True)
    template_snapshot_name = Column(String(100), nullable=True)
    template_snapshot_job_title = Column(String(100), nullable=True)
    status = Column(String(20), default="in_progress")  # in_progress, completed
    overall_score = Column(Float, nullable=True)
    strengths = Column(Text, nullable=True)  # JSON string
    improvements = Column(Text, nullable=True)  # JSON string
    started_at = Column(DateTime, default=datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)

    # Template config snapshot (so feedback is accurate even if template changes)
    experience_level = Column(String(20), nullable=True)
    question_difficulty = Column(String(20), nullable=True)
    probing_strength = Column(String(20), nullable=True)

    user = relationship("User", back_populates="interviews")
    template = relationship("Template", back_populates="interviews")
    questions = relationship("InterviewQuestion", back_populates="interview", cascade="all, delete-orphan", order_by="InterviewQuestion.question_order")


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(String(20), nullable=False)  # behavioral, probing
    response_text = Column(Text, nullable=True)
    score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    question_order = Column(Integer, nullable=False)

    interview = relationship("Interview", back_populates="questions")
