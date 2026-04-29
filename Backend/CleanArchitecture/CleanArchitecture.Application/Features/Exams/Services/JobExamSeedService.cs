using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Application.Interfaces;
using CleanArchitecture.Application.Features.JobPostings.Queries.GenerateEnglishExam;

namespace CleanArchitecture.Core.Features.Exams.Services
{
    /// <summary>
    /// Ensures every JobPosting has exactly 2 auto-approved exams:
    ///   Stage 1 (SequenceOrder = 1): English / Language Assessment
    ///   Stage 2 (SequenceOrder = 2): Technical / Role-Specific
    ///
    /// Called automatically when a candidate applies to a job.
    /// PassThreshold is taken from JobPosting.PipelinePassThreshold.
    /// </summary>
    public class JobExamSeedService
    {
        private readonly IGenericRepositoryAsync<Exam> _examRepo;
        private readonly IGenericRepositoryAsync<Question> _questionRepo;
        private readonly IGenericRepositoryAsync<JobPosting> _jobRepo;
        private readonly IAiJobPostingGenerationService _aiService;

        /// <summary>
        /// When false (default): all candidates for the same job get the same exam.
        /// When true: each candidate gets a freshly AI-generated unique exam.
        /// Toggle this to true when you want per-candidate variety.
        /// </summary>
        private const bool GENERATE_UNIQUE_EXAM_PER_CANDIDATE = false;

        /// <summary>Number of AI generation retry attempts before giving up.</summary>
        private const int AI_RETRY_COUNT = 3;

        public JobExamSeedService(
            IGenericRepositoryAsync<Exam> examRepo,
            IGenericRepositoryAsync<Question> questionRepo,
            IGenericRepositoryAsync<JobPosting> jobRepo,
            IAiJobPostingGenerationService aiService)
        {
            _examRepo     = examRepo;
            _questionRepo = questionRepo;
            _jobRepo      = jobRepo;
            _aiService    = aiService;
        }

        // ── Public API ──────────────────────────────────────────────────────
        /// <summary>Returns the Stage 1 (English) exam, creating it if needed.</summary>
        public Task<Exam> EnsureEnglishExam(Guid jobId) => EnsureExam(jobId, 1);

        /// <summary>Returns the Stage 2 (Technical) exam, creating it if needed.</summary>
        public Task<Exam> EnsureTechnicalExam(Guid jobId) => EnsureExam(jobId, 2);

        /// <summary>
        /// Returns the Stage 1 (English) exam for this job,
        /// creating it (and saving questions) if it doesn't exist yet.
        /// </summary>
        public async Task<Exam> EnsureEnglishExamForJob(Guid jobId) => await EnsureExam(jobId, 1);

        // ── Internal ────────────────────────────────────────────────────────
        private async Task<Exam> EnsureExam(Guid jobId, int stage)
        {
            // When GENERATE_UNIQUE_EXAM_PER_CANDIDATE is false, reuse existing exam for this job+stage
            if (!GENERATE_UNIQUE_EXAM_PER_CANDIDATE)
            {
                var allExams = (List<Exam>)await _examRepo.GetAllAsync();
                var existing = allExams.FirstOrDefault(e =>
                    e.JobId == jobId && e.SequenceOrder == stage && e.Status == "approved");
                if (existing != null) return existing;

                if (stage == 1)
                {
                    var existingEnglish = allExams.FirstOrDefault(e => e.JobId == jobId && (e.SequenceOrder == 1 || e.ExamType == "english") && e.Status == "approved");
                    if (existingEnglish != null) return existingEnglish;
                }
            }

            var job       = await _jobRepo.GetByIdAsync(jobId);
            var threshold = job?.PipelinePassThreshold ?? 70;
            var jobTitle  = job?.JobTitle ?? "Pozisyon";
            var techType  = DetectTechType(job?.JobTitle ?? "", job?.Department ?? "");

            Exam exam;

            if (stage == 1)
            {
                exam = new Exam
                {
                    Id              = Guid.NewGuid(),
                    JobId           = jobId,
                    Title           = $"{jobTitle} — İngilizce Dil Değerlendirmesi",
                    ExamType        = "english",
                    SequenceOrder   = 1,
                    IsMandatory     = true,
                    Status          = "approved",
                    TimeLimitMinutes = 30,
                    PassThreshold   = threshold,
                    ApprovedAt      = DateTime.UtcNow
                };
            }
            else
            {
                exam = new Exam
                {
                    Id              = Guid.NewGuid(),
                    JobId           = jobId,
                    Title           = $"{jobTitle} — Teknik Değerlendirme Sınavı",
                    ExamType        = techType,
                    SequenceOrder   = 2,
                    IsMandatory     = true,
                    Status          = "approved",
                    TimeLimitMinutes = 30,
                    PassThreshold   = threshold,
                    ApprovedAt      = DateTime.UtcNow
                };
            }

            await _examRepo.AddAsync(exam);

            // English = 30 questions, Technical = 20 questions — 100% AI-generated
            int targetTotal = stage == 1 ? 30 : 20;

            List<Question> finalQuestions = new List<Question>();

            // AI generation with retry
            string aiContext = stage == 1
                ? $"ENGLISH_PROFICIENCY_TEST: {jobTitle} {job?.LanguageLevel ?? "B1"}"
                : $"TECHNICAL_ASSESSMENT: {jobTitle} ({techType})";

            for (int attempt = 1; attempt <= AI_RETRY_COUNT; attempt++)
            {
                try
                {
                    Console.WriteLine($"[JobExamSeedService] AI generation attempt {attempt}/{AI_RETRY_COUNT} for stage {stage}");
                    var examDto = await _aiService.GenerateEnglishExamAsync(aiContext);
                    var aiQuestions = ConvertAiQuestionsToEntities(examDto?.Questions);
                    if (aiQuestions != null && aiQuestions.Count >= targetTotal)
                    {
                        finalQuestions.AddRange(aiQuestions.Take(targetTotal));
                        Console.WriteLine($"[JobExamSeedService] AI generated {aiQuestions.Count} questions on attempt {attempt}");
                        break;
                    }
                    else if (aiQuestions != null && aiQuestions.Count > 0)
                    {
                        // Partial result — keep what we got and retry for more
                        finalQuestions.AddRange(aiQuestions);
                        Console.WriteLine($"[JobExamSeedService] AI generated {aiQuestions.Count}/{targetTotal} questions on attempt {attempt}, retrying...");
                    }
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"[JobExamSeedService] AI generation attempt {attempt} failed: {ex.Message}");
                }
            }

            if (finalQuestions.Count < targetTotal)
            {
                Console.Error.WriteLine($"[JobExamSeedService] WARNING: Only {finalQuestions.Count}/{targetTotal} questions generated after {AI_RETRY_COUNT} attempts for stage {stage}");
            }

            // For English exams, keep grammar→vocab→reading order; shuffle technical
            var ordered = stage == 1
                ? finalQuestions.Take(targetTotal).ToList()
                : finalQuestions.OrderBy(x => Guid.NewGuid()).Take(targetTotal).ToList();
            for (int i = 0; i < ordered.Count; i++)
            {
                var q = ordered[i];
                q.Id = Guid.NewGuid();
                q.ExamId = exam.Id;
                q.OrderIndex = i + 1;
                await _questionRepo.AddAsync(q);
            }

            return exam;
        }

        // ── AI question converter ────────────────────────────────────────────────
        private static List<Question> ConvertAiQuestionsToEntities(List<GeneratedExamQuestionDto> dtos)
        {
            if (dtos == null || dtos.Count == 0) return null;
            var result = new List<Question>();
            for (int i = 0; i < dtos.Count; i++)
            {
                var dto = dtos[i];
                if (string.IsNullOrWhiteSpace(dto.QuestionText)) continue;

                // Determine correct answer key (A/B/C/D/E) by matching correctAnswer text to options
                var opts = dto.Options ?? new List<string>();
                string correctKey = "A";
                char[] keys = { 'A', 'B', 'C', 'D', 'E' };
                for (int k = 0; k < opts.Count && k < keys.Length; k++)
                {
                    if (string.Equals(opts[k].Trim(), dto.CorrectAnswer?.Trim(), StringComparison.OrdinalIgnoreCase))
                    {
                        correctKey = keys[k].ToString();
                        break;
                    }
                }

                // Build OptionsJson
                var optionParts = new List<string>();
                for (int k = 0; k < opts.Count && k < keys.Length; k++)
                {
                    if (!string.IsNullOrWhiteSpace(opts[k]))
                        optionParts.Add($"{{\"key\":\"{keys[k]}\",\"text\":\"{Esc(opts[k])}\"}}");
                }
                
                // HARDENING: If fewer than 5 options for a MC question, skip it
                if (optionParts.Count < 5) continue;

                var optionsJson = "[" + string.Join(",", optionParts) + "]";

                result.Add(new Question
                {
                    Id           = Guid.NewGuid(),
                    OrderIndex   = i + 1,
                    Points       = 10,
                    QuestionText = dto.QuestionText,
                    QuestionType = "multiple_choice",
                    CorrectAnswer = correctKey,
                    OptionsJson  = optionsJson
                });
            }
            return result;
        }

        // ── Tech type detection ─────────────────────────────────────────────
        private static string DetectTechType(string title, string dept)
        {
            var s = (title + " " + dept).ToLowerInvariant();
            if (s.Contains("yazılım") || s.Contains("developer") || s.Contains("software") ||
                s.Contains("backend")  || s.Contains("frontend")  || s.Contains("fullstack") ||
                s.Contains("engineer") || s.Contains("mühendis"))
                return "technical";
            if (s.Contains("pazarlama") || s.Contains("marketing") ||
                s.Contains("satış")     || s.Contains("sales"))
                return "case_study";
            if (s.Contains("insan") || s.Contains("hr") || s.Contains("ik"))
                return "personality";
            return "general";
        }

        // ── Question factory helper (kept for potential future use) ───────────
        private static Question Mc(int order, int pts, string text, string correct,
            string a, string b, string c, string d, string e) => new()
        {
            Id = Guid.NewGuid(), OrderIndex = order, Points = pts,
            QuestionText = text, QuestionType = "multiple_choice",
            CorrectAnswer = correct,
            OptionsJson = $"[{{\"key\":\"A\",\"text\":\"{Esc(a)}\"}},{{\"key\":\"B\",\"text\":\"{Esc(b)}\"}},{{\"key\":\"C\",\"text\":\"{Esc(c)}\"}},{{\"key\":\"D\",\"text\":\"{Esc(d)}\"}},{{\"key\":\"E\",\"text\":\"{Esc(e)}\"}}]"
        };

        private static string Esc(string s) => s.Replace("\\", "\\\\").Replace("\"" , "\\\"");
    }
}
