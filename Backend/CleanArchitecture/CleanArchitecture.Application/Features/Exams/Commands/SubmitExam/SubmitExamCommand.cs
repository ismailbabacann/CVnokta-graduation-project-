using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CleanArchitecture.Core.DTOs.Email;
using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Features.Exams.Services;
using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Core.Settings;
using CleanArchitecture.Application.Interfaces;
using MediatR;
using Microsoft.Extensions.Options;

namespace CleanArchitecture.Core.Features.Exams.Commands.SubmitExam
{
    // ── DTOs ──────────────────────────────────────────────────────────────────

    public class AnswerSubmitDto
    {
        public Guid QuestionId { get; set; }
        public string AnswerText { get; set; }
    }

    // ── Command ────────────────────────────────────────────────────────────────

    /// <summary>
    /// POST /api/v1/Exam/submit/{token}
    /// Aday cevaplarını gönderir. MC/TF otomatik puanlanır.
    /// Ardından:
    ///   - Score >= PassThreshold (%) → sonraki aşama aktive edilir / AI mülakat maili
    ///   - Score &lt; PassThreshold (%) → eleme maili + doğru/yanlış raporu
    /// </summary>
    public class SubmitExamCommand : IRequest<SubmitExamResponse>
    {
        public string Token { get; set; }
        public List<AnswerSubmitDto> Answers { get; set; } = new();
    }

    // ── Response ───────────────────────────────────────────────────────────────

    public class QuestionResultDto
    {
        public int OrderIndex    { get; set; }
        public string QuestionText { get; set; }
        public string YourAnswer   { get; set; }
        public string CorrectAnswer { get; set; }
        public bool? IsCorrect    { get; set; }
        public int Points         { get; set; }
        public int PointsEarned   { get; set; }
    }

    public class AutoScoreDto
    {
        public int TotalPointsPossible    { get; set; }
        public int AutoEvaluatedPoints    { get; set; }
        public int PendingManualReview    { get; set; }
        public decimal PercentageScore    { get; set; }
    }

    public class SubmitExamResponse
    {
        public Guid AssignmentId          { get; set; }
        public DateTime SubmittedAt       { get; set; }
        public AutoScoreDto AutoScore     { get; set; }
        public bool Passed                { get; set; }
        public int? NextStage             { get; set; }   // null if eliminated / final
        public string Message             { get; set; }
        public List<QuestionResultDto> Results { get; set; } = new(); // shown on failure
    }

    // ── Handler ────────────────────────────────────────────────────────────────

    public class SubmitExamCommandHandler : IRequestHandler<SubmitExamCommand, SubmitExamResponse>
    {
        private readonly IGenericRepositoryAsync<CandidateExamAssignment>  _assignmentRepo;
        private readonly IGenericRepositoryAsync<Question>                 _questionRepo;
        private readonly IGenericRepositoryAsync<CandidateAnswer>          _answerRepo;
        private readonly IGenericRepositoryAsync<Exam>                     _examRepo;
        private readonly IGenericRepositoryAsync<JobApplication>           _applicationRepo;
        private readonly IPipelineService                                  _pipelineService;
        private readonly ExamSettings                              _examSettings;

        public SubmitExamCommandHandler(
            IGenericRepositoryAsync<CandidateExamAssignment>  assignmentRepo,
            IGenericRepositoryAsync<Question>                 questionRepo,
            IGenericRepositoryAsync<CandidateAnswer>          answerRepo,
            IGenericRepositoryAsync<Exam>                     examRepo,
            IGenericRepositoryAsync<JobApplication>           applicationRepo,
            IPipelineService                                  pipelineService,
            IOptions<ExamSettings>                            examSettings)
        {
            _assignmentRepo   = assignmentRepo;
            _questionRepo     = questionRepo;
            _answerRepo       = answerRepo;
            _examRepo         = examRepo;
            _applicationRepo  = applicationRepo;
            _pipelineService  = pipelineService;
            _examSettings     = examSettings.Value;
        }

        public async Task<SubmitExamResponse> Handle(SubmitExamCommand request, CancellationToken cancellationToken)
        {
            // ── 1. Token → Assignment ───────────────────────────────────────
            var allAssignments = (List<CandidateExamAssignment>)await _assignmentRepo.GetAllAsync();
            var assignment = allAssignments.FirstOrDefault(a => a.Token == request.Token)
                ?? throw new Exception("Geçersiz veya süresi dolmuş sınav tokeni.");

            if (assignment.Status == "submitted")
                throw new Exception("Bu sınav zaten gönderildi.");

            if (assignment.ExpiresAt.HasValue && assignment.ExpiresAt.Value < DateTime.UtcNow)
                throw new Exception("Sınav token süresi dolmuş.");

            // ── 2. Soruları yükle ───────────────────────────────────────────
            var allQuestions = (List<Question>)await _questionRepo.GetAllAsync();
            var examQuestions = allQuestions
                .Where(q => q.ExamId == assignment.ExamId)
                .OrderBy(q => q.OrderIndex)
                .ToList();

            // ── 3. Cevapları kaydet + otomatik puanla ──────────────────────
            int autoPoints    = 0;
            int pendingPoints = 0;
            int totalPoints   = examQuestions.Sum(q => q.Points);
            var submittedAt   = DateTime.UtcNow;
            var resultDetails = new List<QuestionResultDto>();

            foreach (var q in examQuestions)
            {
                var dto = request.Answers.FirstOrDefault(a => a.QuestionId == q.Id);
                bool? isCorrect    = null;
                int?  pointsEarned = null;
                var   answerText   = dto?.AnswerText;

                if (q.QuestionType is "multiple_choice" or "true_false")
                {
                    isCorrect    = string.Equals(answerText?.Trim(), q.CorrectAnswer?.Trim(), StringComparison.OrdinalIgnoreCase);
                    pointsEarned = isCorrect.Value ? q.Points : 0;
                    autoPoints  += pointsEarned.Value;

                    resultDetails.Add(new QuestionResultDto
                    {
                        OrderIndex   = q.OrderIndex,
                        QuestionText = q.QuestionText,
                        YourAnswer   = MapOptionKey(answerText, q.OptionsJson),
                        CorrectAnswer = MapOptionKey(q.CorrectAnswer, q.OptionsJson),
                        IsCorrect    = isCorrect,
                        Points       = q.Points,
                        PointsEarned = pointsEarned.Value
                    });
                }
                else
                {
                    pendingPoints += q.Points;
                }

                await _answerRepo.AddAsync(new CandidateAnswer
                {
                    Id           = Guid.NewGuid(),
                    AssignmentId = assignment.Id,
                    QuestionId   = q.Id,
                    AnswerText   = answerText,
                    IsCorrect    = isCorrect,
                    PointsEarned = pointsEarned,
                    AnsweredAt   = submittedAt
                });
            }

            // ── 4. Yüzde hesapla ────────────────────────────────────────────
            //  Sadece otomatik puanlanan sorular üzerinden → (autoPoints / autoTotal) * 100
            int autoTotal = examQuestions.Where(q => q.QuestionType is "multiple_choice" or "true_false").Sum(q => q.Points);
            decimal pct   = autoTotal > 0 ? Math.Round((decimal)autoPoints / autoTotal * 100, 1) : 0;

            // ── 5. Assignment güncelle ──────────────────────────────────────
            assignment.Status      = "submitted";
            assignment.SubmittedAt = submittedAt;
            assignment.Score       = autoPoints;
            await _assignmentRepo.UpdateAsync(assignment);

            // ── 6. Mevcut Sınavın bilgilerini çek ──────────────────────────
            // ── 6. Pipeline İlerlet ──────────────────────────────────────────
            var allExams  = (List<Exam>)await _examRepo.GetPagedReponseAsync(1, 1000); // Using paged to get list
            var thisExam  = allExams.FirstOrDefault(e => e.Id == assignment.ExamId);
            var stageName = thisExam?.SequenceOrder == 1 ? "ENGLISH_TEST" : "SKILLS_TEST";

            // Find application to get its ID
            var allApps = await _applicationRepo.GetAllAsync();
            var jobApp = allApps.FirstOrDefault(a => a.JobPostingId == assignment.JobId && a.CandidateId == assignment.CandidateId);
            
            if (jobApp != null)
            {
                // Trigger pipeline logic (assignments, emails, etc. are now handled inside)
                await _pipelineService.AdvanceIfEligibleAsync(jobApp.Id, stageName, pct, resultDetails);
            }

            return new SubmitExamResponse
            {
                AssignmentId = assignment.Id,
                SubmittedAt  = submittedAt,
                Passed       = pct >= (thisExam?.PassThreshold ?? 70),
                NextStage    = pct >= (thisExam?.PassThreshold ?? 70) ? (thisExam?.SequenceOrder == 1 ? 2 : (int?)null) : null,
                Message      = pct >= (thisExam?.PassThreshold ?? 70) ? "Sınav başarıyla tamamlandı. Sıradaki aşama için e-postanızı kontrol edin." : "Sınav sonuçlandı.",
                Results      = pct >= (thisExam?.PassThreshold ?? 70) ? new List<QuestionResultDto>() : resultDetails,
                AutoScore    = new AutoScoreDto
                {
                    TotalPointsPossible = totalPoints,
                    AutoEvaluatedPoints = autoPoints,
                    PendingManualReview = pendingPoints,
                    PercentageScore     = pct
                }
            };
        }

        // ── Helper: option key → text ────────────────────────────────────────
        private static string MapOptionKey(string key, string optionsJson)
        {
            if (string.IsNullOrWhiteSpace(key) || string.IsNullOrWhiteSpace(optionsJson)) return key ?? "-";
            try
            {
                // Simple JSON parse without System.Text.Json to avoid extra using
                var idx = optionsJson.IndexOf($"\"key\":\"{key}\"", StringComparison.OrdinalIgnoreCase);
                if (idx < 0) return key;
                var textStart = optionsJson.IndexOf("\"text\":\"", idx) + 8;
                var textEnd   = optionsJson.IndexOf("\"}", textStart);
                return textEnd > textStart ? optionsJson[textStart..textEnd] : key;
            }
            catch { return key; }
        }

    }
}
