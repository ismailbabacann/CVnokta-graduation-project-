from app.services.openai_service import _extract_json_payload


def test_extract_json_payload_from_markdown_fence():
    text = """Here is the result:\n```json\n{\"analysis_score\": 88, \"matching_skills\": \"Python\"}\n```"""
    parsed = _extract_json_payload(text)

    assert parsed["analysis_score"] == 88
    assert parsed["matching_skills"] == "Python"


def test_extract_json_payload_from_noisy_text():
    text = "Model output start... {\"analysis_score\": 91, \"overall_assessment\": \"Strong\"} trailing notes"
    parsed = _extract_json_payload(text)

    assert parsed["analysis_score"] == 91
    assert parsed["overall_assessment"] == "Strong"
