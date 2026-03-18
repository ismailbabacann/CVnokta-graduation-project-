"""
CV Parser — extracts structured data from PDF text.

Uses regex-based heuristics for section detection and entity extraction.
spaCy is used as an optional enhancement for NER when available.
"""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import List, Optional

from app.models.cv import Education, Experience, ParsedCV
from app.utils.pdf_extractor import extract_text
from app.utils.text_cleaner import clean_text

logger = logging.getLogger(__name__)

# ── Section header patterns (English + Turkish) ────────────────────

_SECTION_PATTERNS = {
    "education": re.compile(
        r"\b(education|eğitim|öğrenim|academic)\b", re.IGNORECASE
    ),
    "experience": re.compile(
        r"\b(experience|deneyim|iş\s*deneyimi|work\s*history|employment)\b",
        re.IGNORECASE,
    ),
    "skills": re.compile(
        r"\b(skills|beceri|yetenek|technical\s*skills|competenc)\b", re.IGNORECASE
    ),
    "languages": re.compile(
        r"\b(languages?|dil|yabancı\s*dil)\b", re.IGNORECASE
    ),
    "certifications": re.compile(
        r"\b(certific|sertifika|licenses?|accredit)\b", re.IGNORECASE
    ),
    "summary": re.compile(
        r"\b(summary|profile|about\s*me|hakkımda|özet|objective)\b", re.IGNORECASE
    ),
}

# ── Extraction helpers ──────────────────────────────────────────────

_EMAIL_RE = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
_PHONE_RE = re.compile(r"[\+]?[\d][\d\s\-\(\)]{6,14}\d")
_LINKEDIN_RE = re.compile(r"(?:linkedin\.com/in/|linkedin:?\s*)(\S+)", re.IGNORECASE)
_YEAR_RE = re.compile(r"\b(?:19|20)\d{2}\b")
_DURATION_RE = re.compile(
    r"(\w+\s*\d{4})\s*[-–—]\s*(\w+\s*\d{4}|present|halen|current|günümüz)",
    re.IGNORECASE,
)


def _extract_email(text: str) -> Optional[str]:
    m = _EMAIL_RE.search(text)
    return m.group(0) if m else None


def _extract_phone(text: str) -> Optional[str]:
    m = _PHONE_RE.search(text)
    return m.group(0).strip() if m else None


def _extract_linkedin(text: str) -> Optional[str]:
    m = _LINKEDIN_RE.search(text)
    return m.group(0).strip() if m else None


def _split_sections(text: str) -> dict[str, str]:
    """
    Split CV text into named sections using header detection.

    Returns dict mapping section name → section body text.
    """
    lines = text.split("\n")
    sections: dict[str, list[str]] = {}
    current_section = "header"
    sections[current_section] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if current_section in sections:
                sections[current_section].append("")
            continue

        # Check if this line is a section header
        matched_section = None
        for section_name, pattern in _SECTION_PATTERNS.items():
            if pattern.search(stripped) and len(stripped) < 60:
                matched_section = section_name
                break

        if matched_section:
            current_section = matched_section
            if current_section not in sections:
                sections[current_section] = []
        else:
            if current_section not in sections:
                sections[current_section] = []
            sections[current_section].append(stripped)

    return {k: "\n".join(v).strip() for k, v in sections.items() if v}


def _extract_name(header_text: str) -> Optional[str]:
    """Heuristic: first non-empty line of the header is usually the name."""
    for line in header_text.split("\n"):
        line = line.strip()
        if line and not _EMAIL_RE.search(line) and not _PHONE_RE.search(line):
            # Filter lines that look like addresses or URLs
            if len(line) < 60 and not line.startswith("http"):
                return line
    return None


def _parse_education(text: str) -> List[Education]:
    """Extract education entries from the education section."""
    entries: list[Education] = []
    if not text:
        return entries

    # Split by blank lines or bullet points
    blocks = re.split(r"\n\s*\n|\n(?=[-•●►])", text)
    for block in blocks:
        block = block.strip()
        if not block or len(block) < 10:
            continue

        edu = Education()
        years = _YEAR_RE.findall(block)
        if years:
            edu.end_year = int(years[-1])
            if len(years) > 1:
                edu.start_year = int(years[0])

        # Try to detect degree keywords
        degree_patterns = [
            (r"\b(Ph\.?D|Doctorate|Doktora)\b", "PhD"),
            (r"\b(Master|MSc|MA|MBA|Yüksek\s*Lisans|M\.Sc)\b", "Master"),
            (r"\b(Bachelor|BSc|BA|B\.Sc|Lisans)\b", "Bachelor"),
            (r"\b(Associate|Ön\s*Lisans)\b", "Associate"),
            (r"\b(High\s*School|Lise)\b", "High School"),
        ]
        for pattern, label in degree_patterns:
            if re.search(pattern, block, re.IGNORECASE):
                edu.degree = label
                break

        # The first line is often institution or degree + institution
        lines = [l.strip() for l in block.split("\n") if l.strip()]
        if lines:
            edu.institution = lines[0][:100]
        if len(lines) > 1 and not edu.field_of_study:
            edu.field_of_study = lines[1][:100]

        entries.append(edu)

    return entries


def _parse_experience(text: str) -> List[Experience]:
    """Extract work experience entries from the experience section."""
    entries: list[Experience] = []
    if not text:
        return entries

    blocks = re.split(r"\n\s*\n|\n(?=[-•●►](?!\s*\w{1,3}\b))", text)
    for block in blocks:
        block = block.strip()
        if not block or len(block) < 10:
            continue

        exp = Experience()
        lines = [l.strip() for l in block.split("\n") if l.strip()]

        if lines:
            exp.title = lines[0][:120]
        if len(lines) > 1:
            exp.company = lines[1][:120]
        if len(lines) > 2:
            exp.description = " ".join(lines[2:])[:500]

        # Extract date range
        duration_match = _DURATION_RE.search(block)
        if duration_match:
            exp.start_date = duration_match.group(1)
            exp.end_date = duration_match.group(2)

        entries.append(exp)

    return entries


def _parse_skills(text: str) -> List[str]:
    """Extract skills from the skills section."""
    if not text:
        return []

    # Split by common delimiters
    raw = re.split(r"[,;•●►|\n]+", text)
    skills = [s.strip().strip("-").strip() for s in raw if s.strip()]
    # Filter out very short or very long items
    return [s for s in skills if 1 < len(s) < 80]


def _parse_languages(text: str) -> List[str]:
    """Extract languages from the languages section."""
    if not text:
        return []
    raw = re.split(r"[,;•●►|\n]+", text)
    return [s.strip() for s in raw if s.strip() and len(s.strip()) < 50]


def _parse_certifications(text: str) -> List[str]:
    """Extract certifications from the certifications section."""
    if not text:
        return []
    raw = re.split(r"[•●►\n]+", text)
    return [s.strip() for s in raw if s.strip() and len(s.strip()) > 3]


# ── Public API ──────────────────────────────────────────────────────


def parse_cv_from_text(raw_text: str) -> ParsedCV:
    """
    Parse raw CV text into a structured ParsedCV model.

    This is the pure-logic function; it does not touch the filesystem.
    """
    cleaned = clean_text(raw_text)
    sections = _split_sections(raw_text)  # use original for section detection

    header = sections.get("header", "")

    return ParsedCV(
        full_name=_extract_name(header),
        email=_extract_email(raw_text),
        phone=_extract_phone(raw_text),
        linkedin=_extract_linkedin(raw_text),
        summary=sections.get("summary", None),
        education=_parse_education(sections.get("education", "")),
        experience=_parse_experience(sections.get("experience", "")),
        skills=_parse_skills(sections.get("skills", "")),
        languages=_parse_languages(sections.get("languages", "")),
        certifications=_parse_certifications(sections.get("certifications", "")),
        raw_text=cleaned,
    )


def parse_cv_from_pdf(pdf_path: str | Path) -> ParsedCV:
    """
    End-to-end: PDF file → ParsedCV.

    Raises:
        FileNotFoundError: if file does not exist
        RuntimeError: if text extraction fails
    """
    logger.info("Parsing CV from: %s", pdf_path)
    raw_text = extract_text(pdf_path)
    return parse_cv_from_text(raw_text)
