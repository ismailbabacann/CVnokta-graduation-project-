using CleanArchitecture.Core.DTOs.Email;
using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Core.Helpers;
using CleanArchitecture.Core.Features.Exams.Services;
using CleanArchitecture.Core.Settings;
using MediatR;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Applications.Commands.ApplyToJob
{
    // ─────────────────────────────────────────────────────────────────────────
    // Command – Giriş yapmadan başvuru yapılabilir (AllowAnonymous)
    // ─────────────────────────────────────────────────────────────────────────
    /// <summary>
    /// Bir adayın iş ilanına anonim olarak başvurmasını sağlar.
    /// POST /api/v1/Applications/public/apply
    /// Başvurudan sonra:
    ///   1. İş ilanına ait sınav yoksa otomatik oluşturulur (iş özelinde mock sorular)
    ///   2. Aday için 72 saatlik benzersiz sınav tokeni oluşturulur
    ///   3. Başvuru alındı + sınav linki içeren e-posta gönderilir
    /// </summary>
    public class ApplyToJobCommand : IRequest<ApplyToJobResponse>
    {
        public Guid JobPostingId { get; set; }
        public Guid? CandidateId { get; set; }
        public string FullName   { get; set; }
        public string Email      { get; set; }
        public string Phone      { get; set; }
        public string Location   { get; set; }
        public string LinkedInProfile { get; set; }
        public string CurrentCompany { get; set; }
        public string CoverLetter { get; set; }
        public Guid?  CvId        { get; set; }
        public string CvUrl       { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Response DTO
    // ─────────────────────────────────────────────────────────────────────────
    public class ApplyToJobResponse
    {
        public bool   Success       { get; set; }
        public string Message       { get; set; }
        public Guid?  ApplicationId { get; set; }
        public string ExamToken     { get; set; }
        public DateTime? ExamExpiresAt { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Handler
    // ─────────────────────────────────────────────────────────────────────────
    public class ApplyToJobCommandHandler : IRequestHandler<ApplyToJobCommand, ApplyToJobResponse>
    {
        private readonly IGenericRepositoryAsync<JobApplication>           _applicationRepo;
        private readonly IGenericRepositoryAsync<CandidateProfile>         _candidateRepo;
        private readonly IGenericRepositoryAsync<JobPosting>               _jobPostingRepo;
        private readonly IGenericRepositoryAsync<CandidateExamAssignment>  _assignmentRepo;
        private readonly JobExamSeedService                                _examSeedService;
        private readonly IExamTokenService                                 _tokenService;
        private readonly IEmailService                                     _emailService;
        private readonly ExamSettings                                      _examSettings;

        public ApplyToJobCommandHandler(
            IGenericRepositoryAsync<JobApplication>          applicationRepo,
            IGenericRepositoryAsync<CandidateProfile>        candidateRepo,
            IGenericRepositoryAsync<JobPosting>              jobPostingRepo,
            IGenericRepositoryAsync<CandidateExamAssignment> assignmentRepo,
            JobExamSeedService                               examSeedService,
            IExamTokenService                                tokenService,
            IEmailService                                    emailService,
            IOptions<ExamSettings>                           examSettings)
        {
            _applicationRepo = applicationRepo;
            _candidateRepo   = candidateRepo;
            _jobPostingRepo  = jobPostingRepo;
            _assignmentRepo  = assignmentRepo;
            _examSeedService = examSeedService;
            _tokenService    = tokenService;
            _emailService    = emailService;
            _examSettings    = examSettings.Value;
        }

        public async Task<ApplyToJobResponse> Handle(ApplyToJobCommand request, CancellationToken cancellationToken)
        {
            // ── 1. İlanın var ve aktif olduğunu doğrula ─────────────────────
            var jobPosting = await _jobPostingRepo.GetByIdAsync(request.JobPostingId);
            if (jobPosting == null || jobPosting.Status != "Active")
                return new ApplyToJobResponse { Success = false, Message = "İş ilanı bulunamadı veya aktif değil." };

            // ── 2. Aday profilini bul veya oluştur ──────────────────────────
            CandidateProfile candidate = null;
            if (request.CandidateId.HasValue)
            {
                var allCandidates = (List<CandidateProfile>)await _candidateRepo.GetAllAsync();
                candidate = allCandidates.FirstOrDefault(c =>
                    c.Id == request.CandidateId.Value || c.UserId == request.CandidateId.Value);
            }
            else if (!string.IsNullOrWhiteSpace(request.Email))
            {
                var allCandidates = (List<CandidateProfile>)await _candidateRepo.GetAllAsync();
                candidate = allCandidates.FirstOrDefault(c =>
                    c.Email.ToLower() == request.Email.Trim().ToLower());
            }

            // ── 3. Daha önce başvurmuş mu? ───────────────────────────────────
            if (candidate != null)
            {
                var existingApps = (List<JobApplication>)await _applicationRepo.GetAllAsync();
                var alreadyApplied = existingApps.Any(a =>
                    a.JobPostingId == request.JobPostingId && a.CandidateId == candidate.Id);

                if (alreadyApplied)
                    return new ApplyToJobResponse { Success = false, Message = "Bu iş ilanına zaten başvurdunuz." };

                candidate.Location        = request.Location ?? candidate.Location;
                candidate.LinkedInProfile = request.LinkedInProfile ?? candidate.LinkedInProfile;
                candidate.CurrentCompany  = request.CurrentCompany ?? candidate.CurrentCompany;
                await _candidateRepo.UpdateAsync(candidate);
            }
            else
            {
                candidate = new CandidateProfile
                {
                    UserId          = request.CandidateId,
                    FullName        = request.FullName,
                    Email           = request.Email,
                    Phone           = request.Phone,
                    Location        = request.Location,
                    LinkedInProfile = request.LinkedInProfile,
                    CurrentCompany  = request.CurrentCompany
                };
                await _candidateRepo.AddAsync(candidate);
            }

            // ── 4. Başvuru kaydet ────────────────────────────────────────────
            var application = new JobApplication
            {
                JobPostingId         = request.JobPostingId,
                CandidateId          = candidate.Id,
                CvId                 = request.CvId,
                CvUrl                = request.CvUrl,
                CoverLetter          = request.CoverLetter,
                ApplicationStatus    = "ENGLISH_TEST_PENDING",
                CurrentPipelineStage = "ENGLISH_TEST_PENDING",
                AppliedAt            = DateTime.UtcNow
            };
            await _applicationRepo.AddAsync(application);

            // ── 5. İş ilanına özgü sınavı bul/oluştur + aday için token ─────
            string examToken     = null;
            DateTime? expiresAt = null;
            try
            {
                // Sınav iş ilanına özel — tüm adaylar aynı sınavı farklı token ile alır
                var exam = await _examSeedService.EnsureExamExistsForJob(request.JobPostingId);

                var allAssignments = (List<CandidateExamAssignment>)await _assignmentRepo.GetAllAsync();
                var alreadyAssigned = allAssignments.Any(a =>
                    a.CandidateId == candidate.Id && a.ExamId == exam.Id);

                if (!alreadyAssigned)
                {
                    examToken = _tokenService.GenerateToken(candidate.Id, exam.Id);
                    expiresAt = DateTime.UtcNow.AddHours(72); // 3 gün

                    var assignment = new CandidateExamAssignment
                    {
                        Id                = Guid.NewGuid(),
                        CandidateId       = candidate.Id,
                        ExamId            = exam.Id,
                        JobId             = request.JobPostingId,
                        Token             = examToken,
                        AssignmentBatchId = Guid.NewGuid(),
                        Status            = "pending",
                        SentAt            = DateTime.UtcNow,
                        ExpiresAt         = expiresAt
                    };
                    await _assignmentRepo.AddAsync(assignment);
                }
            }
            catch
            {
                // Sınav ataması başarısız olsa da başvuru tamamlansın
            }

            // ── 6. E-posta gönder ────────────────────────────────────────────
            try
            {
                var candidateEmail = candidate.Email ?? request.Email;
                var candidateName  = candidate.FullName ?? request.FullName ?? "Değerli Aday";

                if (!string.IsNullOrWhiteSpace(candidateEmail))
                {
                    string subject;
                    string emailBody;

                    if (examToken != null)
                    {
                        var baseUrl  = _examSettings.ExamBaseUrl ?? "http://localhost:3000/exam/take";
                        var examLink = $"{baseUrl}/{examToken}";
                        subject  = $"Başvurunuz Alındı & Sınav Daveti — {jobPosting.JobTitle} | CVNokta";
                        emailBody = BuildExamInviteEmail(candidateName, jobPosting.JobTitle,
                            jobPosting.Department, jobPosting.Location, examLink, expiresAt!.Value);
                    }
                    else
                    {
                        subject  = $"Application Received — {jobPosting.JobTitle} | CVNokta";
                        emailBody = EmailTemplateService.GetApplicationReceivedTemplate(
                            candidateName, jobPosting.JobTitle, jobPosting.Department,
                            jobPosting.Location, jobPosting.WorkType, jobPosting.WorkModel);
                    }

                    await _emailService.SendAsync(new EmailRequest
                    {
                        To      = candidateEmail,
                        Subject = subject,
                        Body    = emailBody
                    });
                }
            }
            catch
            {
                // E-posta başarısız olsa da başvuruyu engelleme
            }

            return new ApplyToJobResponse
            {
                Success       = true,
                Message       = "Başvurunuz alındı. Sınav linki e-posta adresinize gönderildi.",
                ApplicationId = application.Id,
                ExamToken     = examToken,
                ExamExpiresAt = expiresAt
            };
        }

        // ── Sınav davet e-postası HTML şablonu ────────────────────────────────
        private static string BuildExamInviteEmail(string name, string jobTitle,
            string department, string location, string examLink, DateTime expiresAt)
        {
            var deadline = expiresAt.ToLocalTime().ToString("dd MMMM yyyy HH:mm");
            return $@"<!DOCTYPE html>
<html lang=""tr""><head><meta charset=""UTF-8""><style>
body{{font-family:'Segoe UI',Arial,sans-serif;background:#f4f6fb;margin:0;padding:0}}
.wrap{{max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}}
.hdr{{background:linear-gradient(135deg,#1a1a2e,#0f3460);padding:36px 32px;text-align:center}}
.brand{{color:#fff;font-size:28px;font-weight:700}}.brand span{{color:#e94560}}
.bdy{{padding:36px 32px}}
h2{{color:#1a1a2e;font-size:21px;margin:0 0 12px}}
p{{color:#555;line-height:1.7;margin:0 0 14px}}
.info{{background:#f8f9ff;border-left:4px solid #0f3460;border-radius:6px;padding:14px 18px;margin:16px 0}}
.info p{{margin:3px 0;color:#333;font-size:14px}}
.exam-cta{{background:linear-gradient(135deg,#667eea,#764ba2);border-radius:10px;padding:24px;text-align:center;margin:24px 0}}
.exam-cta p{{color:rgba(255,255,255,.85);font-size:14px;margin:0 0 16px}}
.btn{{display:inline-block;background:#fff;color:#764ba2;font-weight:700;font-size:16px;padding:13px 34px;border-radius:8px;text-decoration:none}}
.warn{{background:#fff8e1;border:1px solid #ffc107;border-radius:8px;padding:13px 17px;margin:14px 0}}
.warn p{{color:#7a5800;margin:0;font-size:14px}}
.elim{{background:#fff3f3;border:1px solid #f28b82;border-radius:8px;padding:13px 17px;margin:14px 0}}
.elim p{{color:#b00020;margin:0;font-size:14px}}
.ftr{{background:#f4f6fb;padding:18px 32px;text-align:center;color:#aaa;font-size:12px;border-top:1px solid #eee}}
</style></head>
<body><div class=""wrap"">
  <div class=""hdr""><div class=""brand"">CV<span>Nokta</span></div>
    <p style=""color:rgba(255,255,255,.65);margin:6px 0 0;font-size:13px"">Akıllı İşe Alım Platformu</p></div>
  <div class=""bdy"">
    <h2>Merhaba {name},</h2>
    <p><strong>{jobTitle}</strong> pozisyonuna başvurunuz başarıyla alındı. Değerlendirme sürecinizin bir parçası olarak aşağıdaki sınava katılmanızı rica ediyoruz.</p>
    <div class=""info"">
      <p>🏢 <strong>Pozisyon:</strong> {jobTitle}</p>
      <p>📂 <strong>Departman:</strong> {department}</p>
      <p>📍 <strong>Lokasyon:</strong> {location}</p>
    </div>
    <div class=""exam-cta"">
      <p>Aşağıdaki butona tıklayarak değerlendirme sınavına erişebilirsiniz.<br><strong>Bu link yalnızca size özeldir, paylaşmayınız.</strong></p>
      <a href=""{examLink}"" class=""btn"">📝 Sınava Başla</a>
    </div>
    <div class=""warn"">
      <p>⏰ <strong>Son Tarih:</strong> {deadline} — Sınavı bu tarihten önce tamamlamanız gerekmektedir.</p>
    </div>
    <div class=""elim"">
      <p>⚠️ Sınav <strong>72 saat içinde</strong> tamamlanmadığı takdirde başvurunuz <strong>değerlendirme dışı kalacak</strong> ve eleme bildirimi gönderilecektir.</p>
    </div>
    <p>Sınav yaklaşık <strong>45 dakika</strong> sürmektedir. Lütfen sessiz ve kesintisiz bir ortamda başlayın.</p>
    <p>Başarılar dileriz!</p>
  </div>
  <div class=""ftr"">© 2026 CVNokta &nbsp;·&nbsp; <a href=""mailto:support@cvnokta.com"" style=""color:#0f3460"">support@cvnokta.com</a></div>
</div></body></html>";
        }
    }
}
