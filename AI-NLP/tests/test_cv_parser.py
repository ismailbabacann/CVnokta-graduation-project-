"""Tests for the CV parser module."""

from __future__ import annotations


class TestCVParser:
    """Unit tests for app.core.cv_parser."""

    def test_parse_cv_from_text_returns_parsed_cv(self, sample_cv_text):
        from app.core.cv_parser import parse_cv_from_text

        result = parse_cv_from_text(sample_cv_text)
        assert result is not None
        assert result.full_name  # Should extract name
        assert result.email == "ahmet.yilmaz@email.com"
        assert "+90" in (result.phone or "")

    def test_parse_cv_extracts_education(self, sample_cv_text):
        from app.core.cv_parser import parse_cv_from_text

        result = parse_cv_from_text(sample_cv_text)
        assert len(result.education) >= 1
        # At least one education entry should have a degree
        degrees = [e.degree for e in result.education if e.degree]
        assert len(degrees) >= 1

    def test_parse_cv_extracts_experience(self, sample_cv_text):
        from app.core.cv_parser import parse_cv_from_text

        result = parse_cv_from_text(sample_cv_text)
        assert len(result.experience) >= 1
        # Should detect at least one company
        companies = [e.company for e in result.experience if e.company]
        assert len(companies) >= 1

    def test_parse_cv_extracts_skills(self, sample_cv_text):
        from app.core.cv_parser import parse_cv_from_text

        result = parse_cv_from_text(sample_cv_text)
        assert len(result.skills) >= 5  # We know the CV has 11+ skills

    def test_parse_cv_extracts_linkedin(self, sample_cv_text):
        from app.core.cv_parser import parse_cv_from_text

        result = parse_cv_from_text(sample_cv_text)
        assert result.linkedin is not None
        assert "linkedin" in result.linkedin.lower()

    def test_parse_cv_sections_text_property(self, sample_cv_text):
        from app.core.cv_parser import parse_cv_from_text

        result = parse_cv_from_text(sample_cv_text)
        sections_text = result.sections_text
        # sections_text returns a list of strings
        combined = " ".join(sections_text).lower()
        assert "backend developer" in combined or "developer" in combined

    def test_parse_cv_empty_text(self):
        from app.core.cv_parser import parse_cv_from_text

        result = parse_cv_from_text("")
        assert result is not None
        assert result.full_name is None  # No name extractable from empty text
        assert len(result.skills) == 0

    def test_parse_cv_minimal_text(self):
        from app.core.cv_parser import parse_cv_from_text

        result = parse_cv_from_text("John Doe\njohn@example.com\nPython, Java")
        assert result is not None
        assert result.email == "john@example.com"

    def test_parse_cv_education_years_are_full_values(self):
        from app.core.cv_parser import parse_cv_from_text

        text = """
John Doe
EDUCATION
BSc Computer Engineering - Example University 2018 - 2022
""".strip()

        result = parse_cv_from_text(text)
        assert len(result.education) >= 1
        edu = result.education[0]
        assert edu.start_year == 2018
        assert edu.end_year == 2022
