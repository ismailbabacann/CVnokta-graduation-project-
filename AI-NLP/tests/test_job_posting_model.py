from app.models.job_posting import JobPostingInput


def test_job_posting_accepts_title_alias():
    model = JobPostingInput.model_validate({
        "title": "Backend Developer",
        "required_skills": "Python,SQL",
    })

    assert model.job_title == "Backend Developer"
    assert model.required_skills == "Python,SQL"


def test_job_posting_accepts_required_skills_list():
    model = JobPostingInput.model_validate({
        "title": "Security Engineer",
        "required_skills": ["Python", " SQL ", ""],
    })

    assert model.job_title == "Security Engineer"
    assert model.required_skills == "Python, SQL"
