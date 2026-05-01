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
- Each question has exactly 5 options (A through E), only 1 is correct. Options must be distinct and non-empty.
- The first half of questions should be "easy" difficulty, the second half "medium".
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
      "options": ["<option A>", "<option B>", "<option C>", "<option D>", "<option E>"],
      "correct_answer": <0-based index of correct option>,
      "explanation": "<brief explanation>"
    }}
  ]
}}

Important:
- IDs must be sequential: tq-001, tq-002, ..., tq-{count:03d}
- Distribute questions across the required skills evenly.
- Questions must be in English.
- First {easy_count} questions should be "easy", remaining {medium_count} should be "medium".
- Avoid clichés and repetitive textbook examples. Use professional, realistic scenarios.
- IMPORTANT: The "options" array MUST contain exactly 5 strings. NEVER return fewer than 5 options.
"""

# ── English Proficiency ─────────────────────────────────────────────

ENGLISH_SYSTEM_PROMPT = """\
You are an expert English language assessment specialist. Your task is to \
generate multiple-choice English test questions at the specified CEFR level.

The test evaluates three competency areas:
1. Grammar — sentence structure, tenses, conditionals, articles, prepositions, \
   modals, passive voice, relative clauses, reported speech
2. Vocabulary — word meaning, synonyms, antonyms, contextual usage, \
   collocations, phrasal verbs, idiomatic expressions
3. Reading Comprehension — a short paragraph (3-5 sentences) about a \
   professional/workplace topic, followed by a comprehension question

Rules:
- Match question difficulty to the specified CEFR level strictly.
- Each question has exactly 5 options (A through E), only 1 is correct. Options must be distinct and non-empty.
- Distractors must be plausible — avoid obviously wrong answers.
- Provide a brief explanation for the correct answer.
- For reading comprehension: each question must include a unique short paragraph \
  within the question text, then ask a comprehension question about it.
- Output valid JSON only, no markdown fences, no extra text.
"""

ENGLISH_USER_PROMPT_TEMPLATE = """\
Generate exactly {count} multiple-choice English proficiency questions at {cefr_level} level (CEFR).

Distribute questions exactly as follows:
- grammar: exactly {grammar_count} questions
- vocabulary: exactly {vocab_count} questions
- reading_comprehension: exactly {reading_count} questions

CEFR Level Guidelines for {cefr_level}:
{level_description}

Output format — a JSON object with a "questions" array:
{{
  "questions": [
    {{
      "id": "eq-001",
      "category": "grammar" | "vocabulary" | "reading_comprehension",
      "difficulty": "{cefr_level}",
      "question": "<question text>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>", "<option E>"],
      "correct_answer": <0-based index of correct option>,
      "explanation": "<brief explanation>"
    }}
  ]
}}

Important:
- IDs must be sequential: eq-001, eq-002, ..., eq-{count:03d}
- For reading comprehension, embed a short paragraph (3-5 sentences) in the question text, \
  then ask a comprehension question about it. Each of the {reading_count} questions must have \
  its own unique paragraph — do NOT reuse paragraphs.
- Paragraphs should cover diverse professional topics: business, technology, workplace, \
  environment, healthcare, education, etc.
- Questions must test practical English skills relevant to a professional/workplace context.
- Avoid repeating common English test clichés. Vary the sentence structures.
- IMPORTANT: The "options" array MUST contain exactly 5 strings. NEVER return fewer than 5 options.
"""

# ── CEFR Level Descriptions ─────────────────────────────────────────

CEFR_LEVEL_DESCRIPTIONS = {
    "A2": (
        "A2 (Elementary): Simple grammar (present simple, past simple, basic future), "
        "everyday vocabulary, short and simple sentences. Questions should test basic "
        "understanding of familiar topics like daily routines, shopping, and simple instructions."
    ),
    "B1": (
        "B1 (Intermediate): Present perfect, comparatives/superlatives, first conditional, "
        "basic passive voice, common phrasal verbs. Vocabulary covers work, travel, "
        "and familiar topics. Reading passages should be straightforward with clear main ideas."
    ),
    "B2": (
        "B2 (Upper-Intermediate): Mixed conditionals, reported speech, relative clauses, "
        "passive constructions, modals of deduction. Rich vocabulary including collocations "
        "and less common phrasal verbs. Reading passages can have implicit meaning and nuance."
    ),
    "C1": (
        "C1 (Advanced): Complex grammar including inversions, cleft sentences, mixed modals, "
        "subjunctive mood, advanced passive. Sophisticated vocabulary with idiomatic expressions, "
        "formal/informal register differences. Reading passages require inference and critical analysis."
    ),
}
