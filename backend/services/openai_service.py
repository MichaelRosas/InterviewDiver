import os
import json
import random
import logging
from typing import List, Optional
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

client: Optional[OpenAI] = None
api_key = os.getenv("OPENAI_API_KEY", "")
if api_key and not api_key.startswith("sk-your"):
    client = OpenAI(api_key=api_key)
else:
    logger.warning("OPENAI_API_KEY not configured — using mock responses")


# Question Generation

MOCK_BEHAVIORAL_QUESTIONS = [
    "Tell me about a time when you had to deal with a difficult team member. How did you handle the situation?",
    "Describe a situation where you had to meet a tight deadline. What steps did you take to ensure success?",
    "Give me an example of a time you showed leadership in a challenging situation.",
    "Tell me about a time when you made a mistake at work. How did you handle it?",
    "Describe a situation where you had to adapt to a significant change. How did you manage?",
    "Tell me about a project you're particularly proud of. What was your role and what was the outcome?",
    "Give me an example of a time you had to persuade someone to see things your way.",
    "Describe a time when you went above and beyond what was expected of you.",
    "Tell me about a time you had to resolve a conflict between team members.",
    "Describe a situation where you had to make a difficult decision with limited information.",
]


async def generate_interview_questions(
    job_title: str,
    experience_level: str,
    question_difficulty: str,
    behavioral_q_count: int,
    job_description: Optional[str] = None,
) -> List[str]:
    """Generate behavioral interview questions using OpenAI or mock data."""
    if client is None:
        random.shuffle(MOCK_BEHAVIORAL_QUESTIONS)
        return MOCK_BEHAVIORAL_QUESTIONS[:behavioral_q_count]

    jd_section = f"\nJob Description: {job_description}" if job_description else ""

    prompt = f"""Generate exactly {behavioral_q_count} behavioral interview questions for the following position:

Job Title: {job_title}
Experience Level: {experience_level}
Difficulty: {question_difficulty}{jd_section}

Requirements:
- Each question should be a behavioral "Tell me about a time..." style question
- Questions should be appropriate for the experience level and difficulty
- Questions should be relevant to the job title
- {"Make questions more complex and multi-part" if question_difficulty == "Challenging" else "Keep questions straightforward and clear"}

Return ONLY a JSON array of strings, with no additional text. Example:
["Question 1 text here", "Question 2 text here"]"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert interviewer. Return only valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.8,
            max_tokens=2000,
        )
        content = response.choices[0].message.content.strip()
        # Strip markdown code fences if present
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
        questions = json.loads(content)
        if isinstance(questions, list) and len(questions) > 0:
            return questions[:behavioral_q_count]
    except Exception as e:
        logger.error(f"OpenAI question generation failed: {e}")

    # Fallback to mock
    random.shuffle(MOCK_BEHAVIORAL_QUESTIONS)
    return MOCK_BEHAVIORAL_QUESTIONS[:behavioral_q_count]


# Probing Question Generation

async def generate_probing_question(
    original_question: str,
    user_response: str,
    job_title: str,
    probing_strength: str,
) -> Optional[str]:
    """Decide whether to ask a probing question and generate one if so."""
    if probing_strength == "Off":
        return None

    # Probability based on strength
    probability_map = {"Low": 0.3, "Medium": 0.55, "High": 0.8}
    probability = probability_map.get(probing_strength, 0)

    if random.random() > probability:
        return None

    if client is None:
        probing_options = [
            "Can you elaborate more on the specific actions you personally took in that situation?",
            "What was the measurable outcome or result of your actions?",
            "How did that experience change your approach going forward?",
            "What would you do differently if you faced the same situation today?",
            "How did other stakeholders react to your approach?",
        ]
        return random.choice(probing_options)

    prompt = f"""You are conducting a behavioral interview for a {job_title} position.

The interviewer asked: "{original_question}"

The candidate responded: "{user_response}"

Generate ONE follow-up probing question that:
- Digs deeper into their response
- Asks for more specific details, metrics, or outcomes
- Is conversational and natural sounding
- Is a single clear question

Return ONLY the probing question text, nothing else."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert interviewer asking follow-up questions."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=200,
        )
        return response.choices[0].message.content.strip().strip('"')
    except Exception as e:
        logger.error(f"OpenAI probing question failed: {e}")
        return None


# Feedback Generation

async def generate_interview_feedback(
    job_title: str,
    experience_level: str,
    questions_and_responses: List[dict],
) -> dict:
    """Generate comprehensive feedback for a completed interview."""
    if client is None:
        return _mock_feedback(questions_and_responses)

    qa_text = ""
    for i, qa in enumerate(questions_and_responses, 1):
        qa_text += f"\nQ{i} ({qa['type']}): {qa['question']}\n"
        qa_text += f"Response: {qa['response'] or '(No response provided)'}\n"

    prompt = f"""Evaluate this behavioral interview for a {experience_level} {job_title} position.

{qa_text}

Provide a detailed evaluation in the following JSON format:
{{
  "overall_score": <float 1-10>,
  "questions": [
    {{
      "question_id": <int>,
      "score": <float 1-10>,
      "feedback": "<specific feedback for this answer>"
    }}
  ],
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "improvements": ["<area 1>", "<area 2>", ...]
}}

Scoring guidelines:
- 1-3: Poor — vague, off-topic, or missing key elements
- 4-5: Below average — partially addresses the question
- 6-7: Good — solid response with some room for improvement
- 8-9: Excellent — strong STAR method, specific details, clear impact
- 10: Outstanding — exceptional response

Return ONLY valid JSON."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert interview coach providing detailed, constructive feedback. Return only valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.5,
            max_tokens=3000,
        )
        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
        return json.loads(content)
    except Exception as e:
        logger.error(f"OpenAI feedback generation failed: {e}")
        return _mock_feedback(questions_and_responses)


def _mock_feedback(questions_and_responses: List[dict]) -> dict:
    """Generate mock feedback when OpenAI is unavailable."""
    question_feedbacks = []
    total_score = 0

    for i, qa in enumerate(questions_and_responses):
        has_response = bool(qa.get("response"))
        score = round(random.uniform(5.5, 8.5), 1) if has_response else 2.0
        total_score += score
        question_feedbacks.append({
            "question_id": qa.get("id", i + 1),
            "score": score,
            "feedback": (
                "Good use of a specific example. Consider adding more quantifiable results to strengthen your response."
                if has_response
                else "No response was provided for this question."
            ),
        })

    n = len(questions_and_responses) or 1
    return {
        "overall_score": round(total_score / n, 1),
        "questions": question_feedbacks,
        "strengths": [
            "Demonstrated clear communication skills",
            "Provided relevant examples from past experience",
            "Showed good self-awareness",
        ],
        "improvements": [
            "Include more specific metrics and outcomes (STAR method)",
            "Practice conciseness — aim for 2-3 minute responses",
            "Prepare more examples demonstrating leadership",
        ],
    }


# TTS

async def text_to_speech(text: str, voice: str = "alloy") -> Optional[bytes]:
    """Generate speech audio from text using OpenAI TTS."""
    if client is None:
        return None

    valid_voices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]
    if voice not in valid_voices:
        voice = "alloy"

    try:
        response = client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text,
        )
        return response.content
    except Exception as e:
        logger.error(f"OpenAI TTS failed: {e}")
        return None
