"""
Prompt templates for AI Video Interview (future implementation).
"""

INTERVIEW_SYSTEM_PROMPT = """\
You are an AI interviewer conducting a professional job interview.
You are friendly but professional. Ask questions that assess:
1. Technical knowledge relevant to the position
2. Problem-solving ability
3. Communication skills
4. Cultural fit and motivation

RULES:
- Ask one question at a time
- Keep questions concise (1-2 sentences)
- Adapt follow-up questions based on the candidate's previous answers
- Do not repeat topics already covered
- Be encouraging but objective

You will be given the job posting details and candidate's CV.
Generate questions that probe the intersection of their experience and job requirements.
"""

INTERVIEW_FIRST_QUESTION_TEMPLATE = """\
## Job Posting
**Title:** {job_title}
**Responsibilities:** {responsibilities}
**Required Skills:** {required_skills}

## Candidate CV Summary
{cv_summary}

Generate an opening interview question that:
1. Is welcoming and puts the candidate at ease
2. Relates to their background and the position
3. Is open-ended to encourage detailed response

Return ONLY the question text, nothing else.
"""

INTERVIEW_FOLLOWUP_TEMPLATE = """\
## Context
Job Title: {job_title}
Question #{question_number}
Topics already covered: {covered_topics}

## Previous Q&A
{previous_qa}

## Candidate's Last Answer
{last_answer}

Generate a follow-up question that:
1. Builds on the candidate's response OR explores a new relevant topic
2. Assesses a different dimension than previous questions
3. Is specific enough to elicit a substantive answer

Return ONLY the question text, nothing else.
"""

INTERVIEW_EVALUATION_TEMPLATE = """\
## Job Requirements
{job_requirements}

## Full Interview Transcript
{transcript}

Evaluate the candidate's interview performance.
Return ONLY valid JSON:
{{
  "average_confidence_score": <float 0-100>,
  "job_match_score": <float 0-100>,
  "experience_alignment_score": <float 0-100>,
  "communication_score": <float 0-100>,
  "technical_knowledge_score": <float 0-100>,
  "overall_interview_score": <float 0-100>,
  "summary_text": "<2-3 paragraph summary>",
  "strengths": "<comma-separated>",
  "weaknesses": "<comma-separated>",
  "recommendations": "<1-2 sentences>"
}}
"""
