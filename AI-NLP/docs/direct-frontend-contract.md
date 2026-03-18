# Direct Frontend Contract (Temporary)

## Status
- Scope: `AI-NLP` only
- Purpose: Enable temporary direct calls from Frontend to AI-NLP
- Lifetime: Temporary until Backend gateway integration is completed

## Architecture Modes

### Temporary mode (now)
- `Frontend -> AI-NLP`
- Used for rapid integration and demo/testing while backend integration is in progress.

### Correct production mode (target)
- `Frontend -> Backend (.NET API Gateway) -> AI-NLP`
- Why this is correct:
  - Centralized auth and authorization
  - Better audit trails and policy enforcement
  - Better secret and quota control
  - Better service-to-service observability

## Endpoint Stability Levels

### Stable
- `GET /health`
- `GET /`
- `GET /api/v1/tests/{test_type}/questions`
- `POST /api/v1/tests/{test_type}/submit`
- `POST /api/v1/rankings/evaluate`
- `POST /api/v1/rankings/rank`

### Temporary (direct frontend integration)
- `POST /api/v1/cv/analyze-upload`
  - Multipart upload endpoint for browser clients
  - Exists to remove server-side path dependency

### Internal/compatibility
- `POST /api/v1/cv/analyze`
  - Path-based analysis (expects `cv_file_path`)
  - Kept for backend/internal flows

### Future
- `/api/v1/interview/*` (currently placeholder)

## Direct Frontend CV Analysis Contract

### Endpoint
- `POST /api/v1/cv/analyze-upload`

### Request type
- `multipart/form-data`

### Form fields
- `file` (required): PDF file
- `job_posting_json` (required): JSON string compatible with `JobPostingInput`
- `application_id` (optional): UUID string; auto-generated if omitted
- `stage_id` (optional): UUID string; auto-generated if omitted
- `cv_id` (optional): UUID string; auto-generated if omitted

### Optional headers
- `X-API-Key` (optional/conditional): required only when `DIRECT_API_KEY_ENABLED=true`

### Validation
- File extension must be `.pdf`
- MIME type must be `application/pdf` (or `application/octet-stream` for browser fallback)
- Empty file rejected
- File size limited by `CV_MAX_UPLOAD_SIZE_MB` (default: 10)

### Response
- Same shape as `CVAnalysisResult`

### Error semantics
- `400`: invalid file type, malformed UUID, invalid/missing required form values
- `401`: invalid or missing `X-API-Key` when direct API key mode is enabled
- `413`: file too large
- `422`: invalid `job_posting_json` schema
- `500`: internal processing error

## Internal Compatibility Route Safety
- `POST /api/v1/cv/analyze` keeps path-based behavior for internal usage.
- `cv_file_path` is now restricted to allowed project directories and must point to a PDF.
- Path traversal outside allowed roots is rejected with `400`.

## Migration Note (to correct architecture)
- Keep frontend payload format stable.
- Move the same payload to backend endpoint.
- Backend forwards request to AI-NLP and persists results.
- Frontend should eventually stop calling AI-NLP directly.
