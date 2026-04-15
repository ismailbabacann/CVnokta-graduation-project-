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
        private readonly IGenericRepositoryAsync<CandidateProfile>         _candidateRepo;
        private readonly IGenericRepositoryAsync<JobPosting>               _jobRepo;
        private readonly JobExamSeedService                                _examSeedService;
        private readonly IExamTokenService                                 _tokenService;
        private readonly IEmailService                                     _emailService;
        private readonly ExamSettings                                      _examSettings;

        public SubmitExamCommandHandler(
            IGenericRepositoryAsync<CandidateExamAssignment>  assignmentRepo,
            IGenericRepositoryAsync<Question>                 questionRepo,
            IGenericRepositoryAsync<CandidateAnswer>          answerRepo,
            IGenericRepositoryAsync<Exam>                     examRepo,
            IGenericRepositoryAsync<CandidateProfile>         candidateRepo,
            IGenericRepositoryAsync<JobPosting>               jobRepo,
            JobExamSeedService                                examSeedService,
            IExamTokenService                                 tokenService,
            IEmailService                                     emailService,
            IOptions<ExamSettings>                            examSettings)
        {
            _assignmentRepo   = assignmentRepo;
            _questionRepo     = questionRepo;
            _answerRepo       = answerRepo;
            _examRepo         = examRepo;
            _candidateRepo    = candidateRepo;
            _jobRepo          = jobRepo;
            _examSeedService  = examSeedService;
            _tokenService     = tokenService;
            _emailService     = emailService;
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
            var allExams  = (List<Exam>)await _examRepo.GetAllAsync();
            var thisExam  = allExams.FirstOrDefault(e => e.Id == assignment.ExamId);
            var jobPosting = await _jobRepo.GetByIdAsync(assignment.JobId);
            var threshold  = thisExam?.PassThreshold ?? jobPosting?.PipelinePassThreshold ?? 70;
            var stage      = thisExam?.SequenceOrder ?? 1;
            bool passed    = pct >= threshold;

            // ── 7. Aday bilgisi ─────────────────────────────────────────────
            var allCandidates = (List<CandidateProfile>)await _candidateRepo.GetAllAsync();
            var candidate     = allCandidates.FirstOrDefault(c => c.Id == assignment.CandidateId);
            var candidateEmail = candidate?.Email ?? "";
            var candidateName  = candidate?.FullName ?? "Değerli Aday";
            var baseUrl        = _examSettings.ExamBaseUrl ?? "http://localhost:3000/exam/take";

            string responseMessage;
            int?   nextStage = null;

            // ── 8. Cascade akışı ────────────────────────────────────────────
            if (passed)
            {
                if (stage == 1)
                {
                    // ✅ İngilizce geçildi → Teknik sınav gönder
                    nextStage = 2;
                    responseMessage = $"Tebrikler! İngilizce sınavını %{pct} ile geçtiniz. Teknik sınav e-posta adresinize gönderildi.";
                    try
                    {
                        var techExam   = await _examSeedService.EnsureTechnicalExam(assignment.JobId);
                        var techToken  = _tokenService.GenerateToken(assignment.CandidateId, techExam.Id);
                        var techExpiry = DateTime.UtcNow.AddHours(72);

                        var techAssignment = new CandidateExamAssignment
                        {
                            Id                = Guid.NewGuid(),
                            CandidateId       = assignment.CandidateId,
                            ExamId            = techExam.Id,
                            JobId             = assignment.JobId,
                            Token             = techToken,
                            AssignmentBatchId = Guid.NewGuid(),
                            Status            = "pending",
                            SentAt            = DateTime.UtcNow,
                            ExpiresAt         = techExpiry
                        };
                        await _assignmentRepo.AddAsync(techAssignment);

                        if (!string.IsNullOrWhiteSpace(candidateEmail))
                        {
                            var examLink = $"{baseUrl}/{techToken}";
                            await _emailService.SendAsync(new EmailRequest
                            {
                                To      = candidateEmail,
                                Subject = $"Teknik Değerlendirme Sınavı Daveti — {jobPosting?.JobTitle} | CVNokta",
                                Body    = BuildNextStageEmail(candidateName, jobPosting?.JobTitle, techExam.Title,
                                              pct, threshold, examLink, techExpiry, 2)
                            });
                        }
                    }
                    catch { /* Sınav ataması başarısız olsa da submit tamamlansın */ }
                }
                else
                {
                    // ✅ Teknik sınav da geçildi → AI Mülakat daveti
                    nextStage = null;
                    responseMessage = $"Tebrikler! Teknik sınavı da %{pct} ile başarıyla geçtiniz. AI Mülakat davet linki e-postanıza gönderildi.";
                    try
                    {
                        if (!string.IsNullOrWhiteSpace(candidateEmail))
                        {
                            await _emailService.SendAsync(new EmailRequest
                            {
                                To      = candidateEmail,
                                Subject = $"AI Mülakat Daveti — {jobPosting?.JobTitle} | CVNokta",
                                Body    = BuildAiInterviewEmail(candidateName, jobPosting?.JobTitle, pct)
                            });
                        }
                    }
                    catch { }
                }
            }
            else
            {
                // ❌ Eşik altı → Eleme maili + detaylar
                nextStage = null;
                var stageName = stage == 1 ? "İngilizce" : "Teknik";
                responseMessage = $"Üzgünüz, {stageName} sınavında %{pct} puanla başarısız oldunuz (geçme eşiği: %{threshold}). Eleme e-postası gönderildi.";
                try
                {
                    if (!string.IsNullOrWhiteSpace(candidateEmail))
                    {
                        var mockFeedback = "Değerlendirme sonucunda temel konularda başarılı bir performans sergilediğiniz, ancak rolün gerektirdiği bazı ileri düzey yetkinlikler ve spesifik araç kullanımında daha fazla tecrübeye ihtiyaç duyduğunuz gözlemlenmiştir. İlginiz ve çabanız için teşekkür ederiz.";
                        
                        await _emailService.SendAsync(new EmailRequest
                        {
                            To      = candidateEmail,
                            Subject = $"Değerlendirme Sonucu — {jobPosting?.JobTitle} | CVNokta",
                            Body    = BuildEliminationEmail(candidateName, jobPosting?.JobTitle,
                                          stage == 1 ? "İngilizce Dil Değerlendirmesi" : "Teknik Değerlendirme",
                                          pct, threshold, autoPoints, autoTotal, mockFeedback)
                        });
                    }
                }
                catch { }
            }

            return new SubmitExamResponse
            {
                AssignmentId = assignment.Id,
                SubmittedAt  = submittedAt,
                Passed       = passed,
                NextStage    = nextStage,
                Message      = responseMessage,
                Results      = passed ? new List<QuestionResultDto>() : resultDetails,
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

        // ══════════════════════════════════════════════════════════════════════
        // E-posta şablonları
        // ══════════════════════════════════════════════════════════════════════

        private static string BuildNextStageEmail(string name, string jobTitle, string nextExamTitle,
            decimal score, int threshold, string examLink, DateTime expiresAt, int nextStageNum)
        {
            var deadline  = expiresAt.ToLocalTime().ToString("dd MMMM yyyy HH:mm");
            var stageLabel = nextStageNum == 2 ? "Teknik Değerlendirme" : $"Aşama {nextStageNum}";
            return $@"<!DOCTYPE html><html lang=""tr""><head><meta charset=""UTF-8""><style>
body{{font-family:'Segoe UI',Arial,sans-serif;background:#f4f6fb;margin:0;padding:0}}
.wrap{{max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}}
.hdr{{background:linear-gradient(135deg,#1a1a2e,#0f3460);padding:36px 32px;text-align:center}}
.brand{{color:#fff;font-size:28px;font-weight:700}}.brand span{{color:#e94560}}
.bdy{{padding:32px}}
h2{{color:#1a1a2e;font-size:20px;margin:0 0 12px}}
p{{color:#555;line-height:1.7;margin:0 0 14px}}
.score-box{{text-align:center;padding:20px;background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-radius:12px;margin:16px 0}}
.score-num{{font-size:48px;font-weight:900;color:#065f46}}
.score-lbl{{color:#065f46;font-size:14px;font-weight:600}}
.exam-cta{{background:linear-gradient(135deg,#667eea,#764ba2);border-radius:10px;padding:24px;text-align:center;margin:20px 0}}
.exam-cta p{{color:rgba(255,255,255,.85);font-size:14px;margin:0 0 14px}}
.btn{{display:inline-block;background:#fff;color:#764ba2;font-weight:700;font-size:16px;padding:12px 32px;border-radius:8px;text-decoration:none}}
.warn{{background:#fff8e1;border:1px solid #ffc107;border-radius:8px;padding:12px 16px;margin:12px 0}}
.warn p{{color:#7a5800;margin:0;font-size:14px}}
.ftr{{background:#f4f6fb;padding:16px 32px;text-align:center;color:#aaa;font-size:12px;border-top:1px solid #eee}}
</style></head><body><div class=""wrap"">
<div class=""hdr""><div class=""brand"">CV<span>Nokta</span></div></div>
<div class=""bdy"">
  <h2>🎉 Tebrikler, {name}!</h2>
  <p><strong>{jobTitle}</strong> pozisyonu için <strong>İngilizce Dil Değerlendirmesi'ni</strong> başarıyla geçtiniz.</p>
  <div class=""score-box"">
    <div class=""score-num"">%{score}</div>
    <div class=""score-lbl"">Geçme Eşiği: %{threshold}</div>
  </div>
  <p>Sürecinizin bir sonraki adımı olan <strong>{stageLabel}</strong> sınavına davet edildiniz:</p>
  <div class=""exam-cta"">
    <p><strong>{nextExamTitle}</strong><br>Bu link yalnızca size özeldir.</p>
    <a href=""{examLink}"" class=""btn"">📝 Sınava Başla</a>
  </div>
  <div class=""warn""><p>⏰ <strong>Son Tarih:</strong> {deadline} — Sınavı bu süre içinde tamamlamanız gerekmektedir.</p></div>
  <p>Başarılar dileriz!</p>
</div>
<div class=""ftr"">© 2026 CVNokta</div>
</div></body></html>";
        }

        private static string BuildAiInterviewEmail(string name, string jobTitle, decimal score)
        {
            return $@"<!DOCTYPE html><html lang=""tr""><head><meta charset=""UTF-8""><style>
body{{font-family:'Segoe UI',Arial,sans-serif;background:#f4f6fb;margin:0;padding:0}}
.wrap{{max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}}
.hdr{{background:linear-gradient(135deg,#0f3460,#667eea);padding:36px 32px;text-align:center}}
.brand{{color:#fff;font-size:28px;font-weight:700}}.brand span{{color:#e94560}}
.bdy{{padding:32px}}
h2{{color:#1a1a2e;font-size:20px;margin:0 0 12px}}
p{{color:#555;line-height:1.7;margin:0 0 14px}}
.congrats{{text-align:center;padding:24px;background:linear-gradient(135deg,#eef2ff,#f5f0ff);border-radius:12px;margin:16px 0;border:2px solid #667eea}}
.trophie{{font-size:56px;margin-bottom:8px}}
.stage-info{{background:#f1f5f9;border-radius:10px;padding:16px 20px;margin:16px 0}}
.stage-info p{{margin:4px 0;color:#334155;font-size:14px}}
.ftr{{background:#f4f6fb;padding:16px 32px;text-align:center;color:#aaa;font-size:12px;border-top:1px solid #eee}}
</style></head><body><div class=""wrap"">
<div class=""hdr""><div class=""brand"">CV<span>Nokta</span></div></div>
<div class=""bdy"">
  <h2>🏆 Tebrikler, {name}!</h2>
  <div class=""congrats"">
    <div class=""trophie"">🤖</div>
    <p style=""color:#3730a3;font-weight:700;font-size:18px;margin:0"">AI Mülakat Aşamasına Geçtiniz!</p>
  </div>
  <p><strong>{jobTitle}</strong> pozisyonu için tüm değerlendirme sınavlarını başarıyla tamamladınız.</p>
  <div class=""stage-info"">
    <p>✅ <strong>İngilizce Değerlendirmesi:</strong> Geçti</p>
    <p>✅ <strong>Teknik Değerlendirme:</strong> %{score} — Geçti</p>
    <p>🤖 <strong>Sonraki Adım:</strong> AI Mülakat (link ayrıca gönderilecektir)</p>
  </div>
  <p>AI Mülakat linkiniz birkaç iş günü içinde e-posta adresinize iletilecektir. Süreç hakkında sorularınız için destek ekibimizle iletişime geçebilirsiniz.</p>
  <p>Başarılar dileriz!</p>
</div>
<div class=""ftr"">© 2026 CVNokta · <a href=""mailto:support@cvnokta.com"" style=""color:#0f3460"">support@cvnokta.com</a></div>
</div></body></html>";
        }

        private static string BuildEliminationEmail(string name, string jobTitle, string examName,
            decimal score, int threshold, int earnedPoints, int totalPoints, string feedbackText = null)
        {
            var feedbackSection = string.IsNullOrWhiteSpace(feedbackText) 
                ? "" 
                : $@"<div class=""results-hdr"">📝 AI Feedback</div>
                     <div style=""background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;color:#334155;font-size:14px;line-height:1.6;margin-bottom:10px;"">
                       {feedbackText}
                     </div>";

            return $@"<!DOCTYPE html><html lang=""tr""><head><meta charset=""UTF-8""><style>
body{{font-family:'Segoe UI',Arial,sans-serif;background:#f4f6fb;margin:0;padding:0}}
.wrap{{max-width:640px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}}
.hdr{{background:linear-gradient(135deg,#1a1a2e,#0f3460);padding:32px;text-align:center}}
.brand{{color:#fff;font-size:26px;font-weight:700}}.brand span{{color:#e94560}}
.bdy{{padding:28px 32px}}
h2{{color:#1a1a2e;font-size:20px;margin:0 0 12px}}
p{{color:#555;line-height:1.7;margin:0 0 12px}}
.score-box{{text-align:center;padding:20px;background:linear-gradient(135deg,#fff5f5,#fecaca);border-radius:12px;margin:14px 0;border:1.5px solid #fca5a5}}
.score-num{{font-size:48px;font-weight:900;color:#b91c1c}}
.score-lbl{{color:#b91c1c;font-size:13px;font-weight:600}}
.results-hdr{{font-size:16px;font-weight:700;color:#334155;margin:20px 0 12px}}
.ftr{{background:#f4f6fb;padding:16px 32px;text-align:center;color:#aaa;font-size:12px;border-top:1px solid #eee}}
</style></head><body><div class=""wrap"">
<div class=""hdr""><div class=""brand"">CV<span>Nokta</span></div></div>
<div class=""bdy"">
  <h2>Sayın {name},</h2>
  <p><strong>{jobTitle}</strong> pozisyonu için katıldığınız <strong>{examName}</strong> sonuçlarınız değerlendirilmiştir.</p>
  <div class=""score-box"">
    <div class=""score-num"">%{score}</div>
    <div class=""score-lbl"">Geçme Eşiği: %{threshold} · Mevcut Süreç Tamamlandı</div>
  </div>
  <p style=""color:#6b7280;font-size:13px"">Aldığınız puan: <strong>{earnedPoints}/{totalPoints}</strong></p>
  <p>Ne yazık ki bu aşamada belirlenen değerlendirme eşiğine ulaşamadınız. Aday havuzumuzda kaydınız aktif kalacak ve uygun pozisyonlar için tekrar değerlendirilebilirsiniz.</p>
  {feedbackSection}
  <p style=""margin-top:20px"">Katılımınız için teşekkür ederiz. Başarılar dileriz.</p>
</div>
<div class=""ftr"">© 2026 CVNokta · <a href=""mailto:support@cvnokta.com"" style=""color:#0f3460"">support@cvnokta.com</a></div>
</div></body></html>";
        }
    }
}
