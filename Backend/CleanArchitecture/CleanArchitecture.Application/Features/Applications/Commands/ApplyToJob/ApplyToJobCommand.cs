using CleanArchitecture.Core.DTOs.Email;
using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Core.Helpers;
using MediatR;
using System;
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
    /// </summary>
    public class ApplyToJobCommand : IRequest<ApplyToJobResponse>
    {
        public Guid JobPostingId { get; set; }

        // Aday kişisel bilgileri (kayıtsız kullanıcı için de kullanılır)
        public Guid? CandidateId { get; set; }   // Üye olan adaylar için opsiyonel
        public string FullName   { get; set; }
        public string Email      { get; set; }
        public string Phone      { get; set; }

        public string Location   { get; set; }
        public string LinkedInProfile { get; set; }
        public string CurrentCompany { get; set; }

        // Ek bilgiler
        public string CoverLetter { get; set; }
        public Guid?  CvId        { get; set; }   // Yüklü CV varsa
        public string CvUrl       { get; set; }   // Frontend seçili CV linki verirse
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Response DTO
    // ─────────────────────────────────────────────────────────────────────────
    public class ApplyToJobResponse
    {
        public bool   Success       { get; set; }
        public string Message       { get; set; }
        public Guid?  ApplicationId { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Handler
    // ─────────────────────────────────────────────────────────────────────────
    public class ApplyToJobCommandHandler : IRequestHandler<ApplyToJobCommand, ApplyToJobResponse>
    {
        private readonly IGenericRepositoryAsync<JobApplication>    _applicationRepo;
        private readonly IGenericRepositoryAsync<CandidateProfile> _candidateRepo;
        private readonly IGenericRepositoryAsync<JobPosting>       _jobPostingRepo;
        private readonly IEmailService _emailService;

        public ApplyToJobCommandHandler(
            IGenericRepositoryAsync<JobApplication>    applicationRepo,
            IGenericRepositoryAsync<CandidateProfile> candidateRepo,
            IGenericRepositoryAsync<JobPosting>       jobPostingRepo,
            IEmailService emailService)
        {
            _applicationRepo = applicationRepo;
            _candidateRepo   = candidateRepo;
            _jobPostingRepo  = jobPostingRepo;
            _emailService    = emailService;
        }

        public async Task<ApplyToJobResponse> Handle(ApplyToJobCommand request, CancellationToken cancellationToken)
        {
            // İlanın var olduğunu ve aktif olduğunu doğrula
            var jobPosting = await _jobPostingRepo.GetByIdAsync(request.JobPostingId);
            if (jobPosting == null || jobPosting.Status != "Active")
                return new ApplyToJobResponse { Success = false, Message = "İş ilanı bulunamadı veya aktif değil." };

            // Aday profilini e-posta ile bul (üye değilse null olabilir)
            CandidateProfile candidate = null;
            if (request.CandidateId.HasValue)
            {
                var allCandidates = await _candidateRepo.GetAllAsync();
                candidate = System.Linq.Enumerable.FirstOrDefault(
                    allCandidates, c => c.Id == request.CandidateId.Value || c.UserId == request.CandidateId.Value);
            }
            else if (!string.IsNullOrWhiteSpace(request.Email))
            {
                var allCandidates = await _candidateRepo.GetAllAsync();
                candidate = System.Linq.Enumerable.FirstOrDefault(
                    allCandidates, c => c.Email.ToLower() == request.Email.Trim().ToLower());
            }

            // Daha önce başvurmuş mu kontrol et
            if (candidate != null)
            {
                var existingApps = await _applicationRepo.GetAllAsync();
                var alreadyApplied = System.Linq.Enumerable.Any(existingApps,
                    a => a.JobPostingId == request.JobPostingId && a.CandidateId == candidate.Id);

                if (alreadyApplied)
                    return new ApplyToJobResponse { Success = false, Message = "Bu iş ilanına zaten başvurdunuz." };
                
                // Varsa profilini güncelle (Yeni UI'dan gelenlerle)
                candidate.Location = request.Location ?? candidate.Location;
                candidate.LinkedInProfile = request.LinkedInProfile ?? candidate.LinkedInProfile;
                candidate.CurrentCompany = request.CurrentCompany ?? candidate.CurrentCompany;
                await _candidateRepo.UpdateAsync(candidate);
            }
            else
            {
                // Aday bulunamadı, anonim başvuru için yeni profil oluştur
                candidate = new CandidateProfile
                {
                    UserId = request.CandidateId,
                    FullName = request.FullName,
                    Email = request.Email,
                    Phone = request.Phone,
                    Location = request.Location,
                    LinkedInProfile = request.LinkedInProfile,
                    CurrentCompany = request.CurrentCompany
                };
                await _candidateRepo.AddAsync(candidate);
            }

            // Yeni başvuru oluştur
            var application = new JobApplication
            {
                JobPostingId      = request.JobPostingId,
                CandidateId       = candidate.Id,
                CvId              = request.CvId, 
                CvUrl             = request.CvUrl,
                CoverLetter       = request.CoverLetter,
                ApplicationStatus = "SUBMITTED",
                AppliedAt         = DateTime.UtcNow
            };

            await _applicationRepo.AddAsync(application);

            // Adaya başvuru alındı bilgilendirme maili gönder
            try
            {
                var candidateEmail = candidate.Email ?? request.Email;
                if (!string.IsNullOrWhiteSpace(candidateEmail))
                {
                    var emailHtml = EmailTemplateService.GetApplicationReceivedTemplate(
                        candidate.FullName ?? request.FullName ?? "Candidate",
                        jobPosting.JobTitle,
                        jobPosting.Department,
                        jobPosting.Location,
                        jobPosting.WorkType,
                        jobPosting.WorkModel);

                    await _emailService.SendAsync(new EmailRequest
                    {
                        To = candidateEmail,
                        Subject = $"Application Received — {jobPosting.JobTitle} | CVNokta",
                        Body = emailHtml
                    });
                }
            }
            catch
            {
                // Email failure should not block the application submission
            }

            return new ApplyToJobResponse
            {
                Success       = true,
                Message       = "Başvurunuz başarıyla alındı. En kısa sürede sizinle iletişime geçeceğiz.",
                ApplicationId = application.Id
            };
        }
    }
}

