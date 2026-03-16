import json
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import User, Template, Interview, InterviewQuestion
from schemas import (
    InterviewStart, InterviewStartResponse, QuestionOut,
    ResponseSubmit, NextQuestionResponse,
    InterviewFeedback, QuestionFeedback, InterviewHistoryItem,
    TTSRequest,
)
from auth import get_current_user
from services.openai_service import (
    generate_interview_questions,
    generate_probing_question,
    generate_interview_feedback,
    text_to_speech,
)

router = APIRouter(prefix="/api/interviews", tags=["interviews"])


@router.post("/", response_model=InterviewStartResponse, status_code=status.HTTP_201_CREATED)
async def start_interview(
    body: InterviewStart,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Resolve settings from template or ad-hoc
    if body.template_id:
        template = (
            db.query(Template)
            .filter(Template.id == body.template_id, Template.user_id == user.id)
            .first()
        )
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        job_title = template.job_title
        experience_level = template.experience_level
        job_description = template.job_description
        behavioral_q_count = template.behavioral_q_count
        probing_strength = template.probing_strength
        question_difficulty = template.question_difficulty
        template_name = template.name
    else:
        if not body.job_title:
            raise HTTPException(status_code=400, detail="job_title is required when no template_id")
        job_title = body.job_title
        experience_level = body.experience_level or "Mid"
        job_description = body.job_description
        behavioral_q_count = body.behavioral_q_count or 2
        probing_strength = body.probing_strength or "Off"
        question_difficulty = body.question_difficulty or "Standard"
        template_name = None

    # Generate questions
    questions_text = await generate_interview_questions(
        job_title=job_title,
        experience_level=experience_level,
        question_difficulty=question_difficulty,
        behavioral_q_count=behavioral_q_count,
        job_description=job_description,
    )

    # Create interview record
    interview = Interview(
        user_id=user.id,
        template_id=body.template_id,
        template_snapshot_name=template_name,
        template_snapshot_job_title=job_title,
        experience_level=experience_level,
        question_difficulty=question_difficulty,
        probing_strength=probing_strength,
    )
    db.add(interview)
    db.flush()

    # Create questions records
    for i, q_text in enumerate(questions_text):
        q = InterviewQuestion(
            interview_id=interview.id,
            question_text=q_text,
            question_type="behavioral",
            question_order=i + 1,
        )
        db.add(q)

    db.commit()
    db.refresh(interview)

    first_q = interview.questions[0]
    return InterviewStartResponse(
        interview_id=interview.id,
        first_question=QuestionOut(
            question_id=first_q.id,
            question_text=first_q.question_text,
            question_type=first_q.question_type,
            question_number=1,
            total_main_questions=behavioral_q_count,
        ),
    )


@router.post("/{interview_id}/respond", response_model=NextQuestionResponse)
async def submit_response(
    interview_id: int,
    body: ResponseSubmit,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interview = (
        db.query(Interview)
        .filter(Interview.id == interview_id, Interview.user_id == user.id)
        .first()
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if interview.status != "in_progress":
        raise HTTPException(status_code=400, detail="Interview is not in progress")

    # Save the response
    question = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.id == body.question_id, InterviewQuestion.interview_id == interview.id)
        .first()
    )
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    question.response_text = body.response_text
    db.flush()

    # Count main behavioral questions to track progress
    main_questions = [q for q in interview.questions if q.question_type == "behavioral"]
    total_main = len(main_questions)

    # Find which main question this response belongs to
    if question.question_type == "probing":
        # After a probing question, move to the next main behavioral question.
        # Identify the most recent behavioral question that has a response
        # (the main question this probe followed).
        answered_mains = [
            q for q in main_questions
            if q.response_text is not None
        ]

        parent_main = None
        if answered_mains:
            parent_main = sorted(answered_mains, key=lambda q: q.question_order)[-1]

        if parent_main and parent_main in main_questions:
            parent_idx = main_questions.index(parent_main)
            if parent_idx + 1 < total_main:
                next_behavioral = main_questions[parent_idx + 1]
                current_main_num = parent_idx + 2
                db.commit()
                return NextQuestionResponse(
                    interview_id=interview.id,
                    next_question=QuestionOut(
                        question_id=next_behavioral.id,
                        question_text=next_behavioral.question_text,
                        question_type=next_behavioral.question_type,
                        question_number=current_main_num,
                        total_main_questions=total_main,
                    ),
                    is_complete=False,
                )

        # No next main question found then interview is complete
        db.commit()
        return NextQuestionResponse(
            interview_id=interview.id,
            is_complete=True,
        )
    else:
        # This was a behavioral question (maybe probe then next main)
        probing_q = await generate_probing_question(
            original_question=question.question_text,
            user_response=body.response_text,
            job_title=interview.template_snapshot_job_title or "the position",
            probing_strength=interview.probing_strength or "Off",
        )

        if probing_q:
            max_order = max(q.question_order for q in interview.questions)
            # Insert probing question right after current
            probe = InterviewQuestion(
                interview_id=interview.id,
                question_text=probing_q,
                question_type="probing",
                question_order=max_order + 1,
            )
            db.add(probe)
            db.flush()
            db.refresh(probe)

            current_main_num = main_questions.index(question) + 1
            db.commit()
            return NextQuestionResponse(
                interview_id=interview.id,
                next_question=QuestionOut(
                    question_id=probe.id,
                    question_text=probe.question_text,
                    question_type=probe.question_type,
                    question_number=current_main_num,
                    total_main_questions=total_main,
                ),
                is_complete=False,
            )

        # No probing move to next question
        current_main_idx = main_questions.index(question)
        if current_main_idx + 1 < total_main:
            next_q = main_questions[current_main_idx + 1]
            db.commit()
            return NextQuestionResponse(
                interview_id=interview.id,
                next_question=QuestionOut(
                    question_id=next_q.id,
                    question_text=next_q.question_text,
                    question_type=next_q.question_type,
                    question_number=current_main_idx + 2,
                    total_main_questions=total_main,
                ),
                is_complete=False,
            )
        else:
            db.commit()
            return NextQuestionResponse(
                interview_id=interview.id,
                is_complete=True,
            )


@router.post("/{interview_id}/complete", response_model=InterviewFeedback)
async def complete_interview(
    interview_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interview = (
        db.query(Interview)
        .filter(Interview.id == interview_id, Interview.user_id == user.id)
        .first()
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    # Build Q&A list
    qa_list = []
    for q in sorted(interview.questions, key=lambda x: x.question_order):
        qa_list.append({
            "id": q.id,
            "type": q.question_type,
            "question": q.question_text,
            "response": q.response_text or "",
        })

    # Generate feedback
    feedback_data = await generate_interview_feedback(
        job_title=interview.template_snapshot_job_title or "the position",
        experience_level=interview.experience_level or "Mid",
        questions_and_responses=qa_list,
    )

    # Update question scores
    for qf in feedback_data.get("questions", []):
        q_id = qf.get("question_id")
        # Try to match by index (question_id in feedback is 1-indexed)
        if isinstance(q_id, int) and 1 <= q_id <= len(qa_list):
            real_q_id = qa_list[q_id - 1]["id"]
            db_q = db.query(InterviewQuestion).filter(InterviewQuestion.id == real_q_id).first()
            if db_q:
                db_q.score = qf.get("score")
                db_q.feedback = qf.get("feedback")

    # Update interview
    interview.status = "completed"
    interview.overall_score = feedback_data.get("overall_score", 0)
    interview.strengths = json.dumps(feedback_data.get("strengths", []))
    interview.improvements = json.dumps(feedback_data.get("improvements", []))
    interview.completed_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(interview)

    # Build response
    question_feedbacks = []
    for q in sorted(interview.questions, key=lambda x: x.question_order):
        question_feedbacks.append(QuestionFeedback(
            question_id=q.id,
            question_text=q.question_text,
            question_type=q.question_type,
            response_text=q.response_text,
            score=q.score,
            feedback=q.feedback,
        ))

    return InterviewFeedback(
        interview_id=interview.id,
        template_name=interview.template_snapshot_name,
        job_title=interview.template_snapshot_job_title,
        overall_score=interview.overall_score,
        started_at=interview.started_at,
        completed_at=interview.completed_at,
        strengths=json.loads(interview.strengths) if interview.strengths else [],
        improvements=json.loads(interview.improvements) if interview.improvements else [],
        questions=question_feedbacks,
    )


@router.get("/{interview_id}/feedback", response_model=InterviewFeedback)
def get_feedback(
    interview_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interview = (
        db.query(Interview)
        .filter(Interview.id == interview_id, Interview.user_id == user.id)
        .first()
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if interview.status != "completed":
        raise HTTPException(status_code=400, detail="Interview is not yet completed")

    question_feedbacks = []
    for q in sorted(interview.questions, key=lambda x: x.question_order):
        question_feedbacks.append(QuestionFeedback(
            question_id=q.id,
            question_text=q.question_text,
            question_type=q.question_type,
            response_text=q.response_text,
            score=q.score,
            feedback=q.feedback,
        ))

    return InterviewFeedback(
        interview_id=interview.id,
        template_name=interview.template_snapshot_name,
        job_title=interview.template_snapshot_job_title,
        overall_score=interview.overall_score or 0,
        started_at=interview.started_at,
        completed_at=interview.completed_at,
        strengths=json.loads(interview.strengths) if interview.strengths else [],
        improvements=json.loads(interview.improvements) if interview.improvements else [],
        questions=question_feedbacks,
    )


@router.get("/", response_model=List[InterviewHistoryItem])
def list_interviews(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interviews = (
        db.query(Interview)
        .filter(Interview.user_id == user.id)
        .order_by(Interview.started_at.desc())
        .all()
    )
    result = []
    for iv in interviews:
        result.append(InterviewHistoryItem(
            id=iv.id,
            template_name=iv.template_snapshot_name,
            job_title=iv.template_snapshot_job_title,
            status=iv.status,
            overall_score=iv.overall_score,
            started_at=iv.started_at,
            completed_at=iv.completed_at,
            question_count=len(iv.questions),
        ))
    return result


@router.get("/{interview_id}/current-question", response_model=QuestionOut)
def get_current_question(
    interview_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the next unanswered question for an in-progress interview."""
    interview = (
        db.query(Interview)
        .filter(Interview.id == interview_id, Interview.user_id == user.id)
        .first()
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if interview.status != "in_progress":
        raise HTTPException(status_code=400, detail="Interview is not in progress")

    # Find the first unanswered question
    main_questions = [q for q in interview.questions if q.question_type == "behavioral"]
    total_main = len(main_questions)

    sorted_questions = sorted(interview.questions, key=lambda q: q.question_order)
    for q in sorted_questions:
        if q.response_text is None:
            q_num = (main_questions.index(q) + 1) if q in main_questions else (
                next((main_questions.index(mq) + 1 for mq in main_questions
                      if mq.question_order > q.question_order), total_main)
            )
            return QuestionOut(
                question_id=q.id,
                question_text=q.question_text,
                question_type=q.question_type,
                question_number=q_num,
                total_main_questions=total_main,
            )

    # All answered
    raise HTTPException(status_code=400, detail="All questions have been answered")


@router.post("/tts")
async def tts_endpoint(body: TTSRequest):
    audio_bytes = await text_to_speech(body.text, body.voice)
    if audio_bytes is None:
        raise HTTPException(status_code=503, detail="TTS service unavailable")
    return Response(content=audio_bytes, media_type="audio/mpeg")
