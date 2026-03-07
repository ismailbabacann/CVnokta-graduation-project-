using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
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

        // Ek bilgiler
        public string CoverLetter { get; set; }
        public Guid?  CvId        { get; set; }   // Yüklü CV varsa opsiyonel
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

        public ApplyToJobCommandHandler(
            IGenericRepositoryAsync<JobApplication>    applicationRepo,
            IGenericRepositoryAsync<CandidateProfile> candidateRepo,
            IGenericRepositoryAsync<JobPosting>       jobPostingRepo)
        {
            _applicationRepo = applicationRepo;
            _candidateRepo   = candidateRepo;
            _jobPostingRepo  = jobPostingRepo;
        }

        public async Task<ApplyToJobResponse> Handle(ApplyToJobCommand request, CancellationToken cancellationToken)
        {
            // İlanın var olduğunu ve aktif olduğunu doğrula
            var jobPosting = await _jobPostingRepo.GetByIdAsync(request.JobPostingId);
            if (jobPosting == null || jobPosting.Status != "Published")
                return new ApplyToJobResponse { Success = false, Message = "İş ilanı bulunamadı veya aktif değil." };

            // Aday profilini e-posta ile bul (üye değilse null olabilir)
            CandidateProfile candidate = null;
            if (request.CandidateId.HasValue)
            {
                candidate = await _candidateRepo.GetByIdAsync(request.CandidateId.Value);
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
            }

            // Yeni başvuru oluştur
            var application = new JobApplication
            {
                JobPostingId      = request.JobPostingId,
                CandidateId       = candidate?.Id ?? Guid.Empty,
                CvId              = request.CvId, 
                ApplicationStatus = "SUBMITTED",
                AppliedAt         = DateTime.UtcNow
            };

            await _applicationRepo.AddAsync(application);

            return new ApplyToJobResponse
            {
                Success       = true,
                Message       = "Başvurunuz başarıyla alındı. En kısa sürede sizinle iletişime geçeceğiz.",
                ApplicationId = application.Id
            };
        }
    }
}
