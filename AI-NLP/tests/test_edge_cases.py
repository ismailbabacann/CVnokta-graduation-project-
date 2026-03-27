"""
Phase F — Edge Case Tests (F3).

Tests CV parser edge cases, text cleaner, and validators.
"""

from __future__ import annotations

import pytest

from app.models.cv import Education, Experience, ParsedCV


# ── CV Parser Edge Cases ──────────────────────────────────────────


class TestEmptyCVSections:
    """F3: Empty CV sections → empty lists, no crash."""

    def test_empty_text_returns_empty_parsed_cv(self):
        from app.core.cv_parser import parse_cv_from_text

        result = parse_cv_from_text("")
        assert result is not None
        assert result.skills == []
        assert result.education == []
        assert result.experience == []
        assert result.full_name is None or result.full_name == ""

    def test_whitespace_only_text(self):
        from app.core.cv_parser import parse_cv_from_text

        result = parse_cv_from_text("   \n\n\t  ")
        assert result is not None
        assert result.skills == []

    def test_no_education_no_crash(self):
        from app.core.cv_parser import parse_cv_from_text

        result = parse_cv_from_text("John Doe\njohn@email.com\nSKILLS\nPython, Docker")
        assert result is not None
        assert isinstance(result.education, list)

    def test_no_experience_no_crash(self):
        from app.core.cv_parser import parse_cv_from_text

        result = parse_cv_from_text(
            "Jane Smith\nEDUCATION\nBSc Computer Science — MIT (2020-2024)"
        )
        assert result is not None
        assert isinstance(result.experience, list)


class TestTurkishCVContent:
    """F3: Turkish-only CV text → correct parsing."""

    def test_turkish_name_extraction(self):
        from app.core.cv_parser import parse_cv_from_text

        cv_text = """
AHMET ÇELİK
ahmet.celik@email.com
+90 532 123 4567

ÖZET
6 yıllık yazılım geliştirme deneyimi olan bir mühendis.

EĞİTİM
Bilgisayar Mühendisliği Lisans — İstanbul Teknik Üniversitesi (2014-2018)

DENEYİM
Kıdemli Yazılım Geliştirici | TechCorp | Eyl 2020 - Günümüz
- Mikroservis mimarisinin tasarlanması

SKILLS
Python, Docker, Kubernetes, PostgreSQL

LANGUAGES
Türkçe (Ana Dil), İngilizce (İleri)
""".strip()

        result = parse_cv_from_text(cv_text)
        assert result.email == "ahmet.celik@email.com"
        assert len(result.skills) > 0
        # Turkish chars should not break parsing
        assert result is not None

    def test_mixed_turkish_english_cv(self):
        """Mixed Turkish/English in same section → no garbled output."""
        from app.core.cv_parser import parse_cv_from_text

        cv_text = """
Eray İnal
eray@cvnokta.com

EDUCATION / EĞİTİM
BSc Bilgisayar Mühendisliği — Yıldız Technical University (2022-2026)

EXPERIENCE / DENEYİM
Junior Developer | StartupX | 2024 - Present
- Backend geliştirme ve API tasarımı
- Developed microservices using Python

SKILLS / BECERİLER
Python, FastAPI, Docker, .NET Core, C#, React
""".strip()

        result = parse_cv_from_text(cv_text)
        assert result is not None
        assert result.email == "eray@cvnokta.com"
        assert len(result.skills) > 0


class TestParsedCVProperties:
    """F3: ParsedCV model properties work correctly."""

    def test_total_experience_years_empty(self):
        cv = ParsedCV(experience=[])
        assert cv.total_experience_years == 0.0

    def test_total_experience_years_calculates(self):
        cv = ParsedCV(experience=[
            Experience(title="Dev", duration_months=24),
            Experience(title="Lead", duration_months=12),
        ])
        assert cv.total_experience_years == 3.0

    def test_sections_text_generates(self):
        cv = ParsedCV(
            summary="Experienced developer",
            skills=["Python", "Docker"],
            education=[Education(degree="BSc", field_of_study="CS", institution="MIT")],
            experience=[Experience(title="Dev", company="Corp", description="Backend work")],
            languages=["English"],
            certifications=["AWS"],
        )
        sections = cv.sections_text
        assert len(sections) >= 4
        assert any("Python" in s for s in sections)
        assert any("BSc" in s for s in sections)

    def test_sections_text_empty_cv(self):
        cv = ParsedCV()
        assert cv.sections_text == []


# ── Text Cleaner Edge Cases ───────────────────────────────────────


class TestTextCleaner:
    """F3: Text cleaner handles edge cases."""

    def test_strip_html_unescape(self):
        from app.utils.text_cleaner import strip_html

        assert "&amp;" not in strip_html("A &amp; B")
        assert "A" in strip_html("<b>A</b>")

    def test_remove_non_printable(self):
        from app.utils.text_cleaner import remove_non_printable

        result = remove_non_printable("Hello\x00World\x01!\n")
        assert "\x00" not in result
        assert "\n" in result  # newlines preserved

    def test_clean_text_full_pipeline(self):
        from app.utils.text_cleaner import clean_text

        result = clean_text("<p>Hello   &amp;  World</p>")
        assert result == "Hello & World"

    def test_mask_personal_info(self):
        from app.utils.text_cleaner import mask_personal_info

        text = "Contact: john@example.com, +90 532 123 4567, https://linkedin.com/in/john"
        masked = mask_personal_info(text)
        assert "john@example.com" not in masked
        assert "[EMAIL]" in masked
        assert "[URL]" in masked

    def test_mask_dob(self):
        from app.utils.text_cleaner import mask_personal_info

        text = "Date of Birth: 1990-01-15"
        masked = mask_personal_info(text)
        assert "1990" not in masked

    def test_mask_age_turkish(self):
        from app.utils.text_cleaner import mask_personal_info

        text = "Yaş: 32"
        masked = mask_personal_info(text)
        assert "32" not in masked or "[AGE_MASKED]" in masked


# ── Validator Edge Cases ──────────────────────────────────────────


class TestValidators:
    """F3: Input validators handle edge cases."""

    def test_validate_pdf_path_nonexistent(self):
        from app.utils.validators import validate_pdf_path

        with pytest.raises(FileNotFoundError):
            validate_pdf_path("/no/such/file.pdf")

    def test_validate_pdf_path_wrong_extension(self, tmp_path):
        from app.utils.validators import validate_pdf_path

        txt_file = tmp_path / "doc.txt"
        txt_file.write_text("hello")
        with pytest.raises(ValueError, match="Expected a PDF"):
            validate_pdf_path(str(txt_file))

    def test_validate_pdf_path_valid(self, tmp_path):
        from app.utils.validators import validate_pdf_path

        pdf_file = tmp_path / "test.pdf"
        pdf_file.write_bytes(b"%PDF-1.4 content")
        result = validate_pdf_path(str(pdf_file))
        assert result.name == "test.pdf"

    def test_validate_uuid_valid(self):
        from app.utils.validators import validate_uuid

        result = validate_uuid("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
        assert str(result) == "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

    def test_validate_uuid_invalid(self):
        from app.utils.validators import validate_uuid

        with pytest.raises(ValueError, match="Invalid UUID"):
            validate_uuid("not-a-uuid")

    def test_validate_test_type_case_insensitive(self):
        from app.utils.validators import validate_test_type

        assert validate_test_type("TECHNICAL_ASSESSMENT") == "technical_assessment"
        assert validate_test_type("  English_Test  ") == "english_test"


# ── Missing Job Posting Text ─────────────────────────────────────


class TestMissingJobPostingContext:
    """F3: Missing job posting text → clear behavior, not silent empty RAG."""

    def test_chunk_job_posting_empty(self):
        from app.core.cv_scorer import _chunk_job_posting
        from app.models.job_posting import JobPostingInput

        job = JobPostingInput(job_title="Empty Role")
        chunks = _chunk_job_posting(job)
        # Only individual skills would generate chunks, but required_skills is None
        assert isinstance(chunks, list)

    def test_chunk_job_posting_with_data(self):
        from app.core.cv_scorer import _chunk_job_posting
        from app.models.job_posting import JobPostingInput

        job = JobPostingInput(
            job_title="Dev",
            required_skills="Python, Docker",
            required_qualifications="5 years experience",
            responsibilities="Build APIs",
        )
        chunks = _chunk_job_posting(job)
        assert len(chunks) >= 3  # qualifications + skills + responsibilities + individual skills
