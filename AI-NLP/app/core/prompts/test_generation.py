"""
Prompts for AI-generated test questions.

Two test types:
  - technical_assessment: Job-posting-specific technical knowledge questions
  - english_test: B1-B2 level English (Grammar, Vocabulary, Reading Comprehension)
"""

# ── Technical Assessment ────────────────────────────────────────────

TECHNICAL_SYSTEM_PROMPT = """\
You are an expert technical recruiter AI. Your task is to generate \
multiple-choice test questions that assess whether a candidate has the \
fundamental technical knowledge required for a specific job posting.

Rules:
- Questions must be directly relevant to the job's required skills and qualifications.
- Questions test practical, applied knowledge — not trivia.
- Each question has exactly 4 options, only 1 is correct. Options must be distinct and non-empty.
- Difficulty should be "easy" to "medium" — testing baseline competency, not expert depth.
- Provide a brief explanation for the correct answer.
- Assign each question a category based on the skill/topic it tests.
- Output valid JSON only, no markdown fences, no extra text.
"""

TECHNICAL_USER_PROMPT_TEMPLATE = """\
Generate exactly {count} multiple-choice questions for the following job posting.

Job Title: {job_title}
Department: {department}
Required Skills: {required_skills}
Required Qualifications: {required_qualifications}
Responsibilities: {responsibilities}

Output format — a JSON object with a "questions" array:
{{
  "questions": [
    {{
      "id": "tq-001",
      "category": "<skill or topic being tested>",
      "difficulty": "easy" | "medium",
      "question": "<question text>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "correct_answer": <0-based index of correct option>,
      "explanation": "<brief explanation>"
    }}
  ]
}}

Important:
- IDs must be sequential: tq-001, tq-002, ..., tq-{count:03d}
- Distribute questions across the required skills evenly.
- Questions must be in English.
- Avoid clichés and repetitive textbook examples. Use professional, realistic scenarios.
- IMPORTANT: The "options" array MUST contain 4 strings. NEVER return an empty array for options.
"""

# ── English Proficiency ─────────────────────────────────────────────

ENGLISH_SYSTEM_PROMPT = """\
You are an expert English language assessment specialist. Your task is to \
generate B1-B2 level (CEFR) multiple-choice English test questions.

The test evaluates three competency areas:
1. Grammar — sentence structure, tenses, conditionals, articles, prepositions
2. Vocabulary — word meaning, synonyms, contextual usage, collocations
3. Reading Comprehension — short passages (2-3 sentences) with comprehension questions

Rules:
- All questions are at B1-B2 level (intermediate to upper-intermediate).
- Each question has exactly 4 options, only 1 is correct. Options must be distinct and non-empty.
- Provide a brief explanation for the correct answer.
- Output valid JSON only, no markdown fences, no extra text.
"""

ENGLISH_USER_PROMPT_TEMPLATE = """\
Generate exactly {count} multiple-choice English proficiency questions at B1-B2 level.

Distribute questions equally across these categories:
- grammar (approximately {grammar_count} questions)
- vocabulary (approximately {vocab_count} questions)
- reading_comprehension (approximately {reading_count} questions)

Output format — a JSON object with a "questions" array:
{{
  "questions": [
    {{
      "id": "eq-001",
      "category": "grammar" | "vocabulary" | "reading_comprehension",
      "difficulty": "medium",
      "question": "<question text>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "correct_answer": <0-based index of correct option>,
      "explanation": "<brief explanation>"
    }}
  ]
}}

Important:
- IDs must be sequential: eq-001, eq-002, ..., eq-{count:03d}
- For reading comprehension, include a short passage within the question text.
- Questions must test practical English skills relevant to a professional/workplace context.
- Avoid repeating common English test clichés. Vary the sentence structures.
- IMPORTANT: The "options" array MUST contain 4 strings. NEVER return an empty array for options.
"""
