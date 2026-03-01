using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.JobPostings.Queries.GetJobPostingById
{
    /// <summary>
    /// Returns all details of a single job posting.
    /// Used for the edit page and job posting preview.
    /// </summary>
    public class GetJobPostingByIdQuery : IRequest<GetJobPostingByIdViewModel>
    {
        public Guid Id { get; set; }
    }

    // ────────────────────────────────────────────────────────────────────────
    // ViewModel (Response)
    // ────────────────────────────────────────────────────────────────────────
    public class GetJobPostingByIdViewModel
    {
        // Temel Bilgiler
        public Guid Id { get; set; }
        public string JobTitle { get; set; }
        public string Department { get; set; }
        public string Location { get; set; }
        public string WorkType { get; set; }
        public string WorkModel { get; set; }

        // İlan Detayları
        public string AboutCompany { get; set; }
        public string Responsibilities { get; set; }
        public string RequiredQualifications { get; set; }

        // Finansal
        public decimal? SalaryMin { get; set; }
        public decimal? SalaryMax { get; set; }
        public int TotalPositions { get; set; }

        // AI Ayarları
        public bool AiScanEnabled { get; set; }
        public int MinMatchScore { get; set; }
        public bool AutoEmailEnabled { get; set; }

        // Yan Haklar (liste olarak döner)
        public List<string> Benefits { get; set; }

        // Durum
        public string Status { get; set; }
        public bool IsDraft { get; set; }
        public DateTime PostedDate { get; set; }
        public DateTime? ClosingDate { get; set; }

        // İlişkili Bilgiler
        public string HiringManagerName { get; set; }
    }

    // ────────────────────────────────────────────────────────────────────────
    // Handler
    // ────────────────────────────────────────────────────────────────────────
    public class GetJobPostingByIdQueryHandler : IRequestHandler<GetJobPostingByIdQuery, GetJobPostingByIdViewModel>
    {
        private readonly IGenericRepositoryAsync<JobPosting> _jobPostingRepository;

        public GetJobPostingByIdQueryHandler(IGenericRepositoryAsync<JobPosting> jobPostingRepository)
        {
            _jobPostingRepository = jobPostingRepository;
        }

        public async Task<GetJobPostingByIdViewModel> Handle(GetJobPostingByIdQuery request, CancellationToken cancellationToken)
        {
            var jobPosting = await _jobPostingRepository.GetByIdAsync(request.Id);

            if (jobPosting == null) return null;

            return new GetJobPostingByIdViewModel
            {
                Id                   = jobPosting.Id,
                JobTitle             = jobPosting.JobTitle,
                Department           = jobPosting.Department,
                Location             = jobPosting.Location,
                WorkType             = jobPosting.WorkType,
                WorkModel            = jobPosting.WorkModel,
                AboutCompany         = jobPosting.AboutCompany,
                Responsibilities     = jobPosting.Responsibilities,
                RequiredQualifications = jobPosting.RequiredQualifications,
                SalaryMin            = jobPosting.SalaryMin,
                SalaryMax            = jobPosting.SalaryMax,
                TotalPositions       = jobPosting.TotalPositions,
                AiScanEnabled        = jobPosting.AiScanEnabled,
                MinMatchScore        = jobPosting.MinMatchScore,
                AutoEmailEnabled     = jobPosting.AutoEmailEnabled,
                Benefits             = string.IsNullOrEmpty(jobPosting.Benefits)
                                        ? new List<string>()
                                        : jobPosting.Benefits.Split(',').ToList(),
                Status               = jobPosting.Status,
                IsDraft              = jobPosting.IsDraft,
                PostedDate           = jobPosting.PostedDate,
                ClosingDate          = jobPosting.ClosingDate,
                HiringManagerName    = jobPosting.HiringManager?.FullName
            };
        }
    }
}
