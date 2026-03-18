from pathlib import Path


def test_cv_upload_path_is_resolved_under_project_root():
    from app.config import get_settings

    settings = get_settings()
    expected = (settings.project_root / settings.cv_upload_dir).resolve()

    assert isinstance(settings.cv_upload_path, Path)
    assert settings.cv_upload_path == expected
