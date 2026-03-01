using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.JobPostings.Queries.GetMyJobPostings
{
    /// <summary>
    /// Lists all job postings belonging to the logged-in HR user
    /// Used for "Applications" and "Postings" panel.
    /// </summary>
    public class GetMyJobPostingsQuery : IRequest<IEnumerable<MyJobPostingViewModel>>
    {
        /// <summary>
        /// Filter: "All" | "Active" | "Draft" | "Closed"
        /// If left empty, all postings are retrieved.
        /// </summary>
        public string StatusFilter { get; set; } = "All";
    }

    public class MyJobPostingViewModel
    {
        public Guid Id { get; set; }
        public string JobTitle { get; set; }
        public string Department { get; set; }
        public string Location { get; set; }
        public string WorkType { get; set; }
        public string WorkModel { get; set; }

        /// <summary>AI tarama aktif mi?</summary>
        public bool AiScanEnabled { get; set; }

        /// <summary>"Active" | "Draft" | "Closed"</summary>
        public string Status { get; set; }
        public bool IsDraft { get; set; }

        public DateTime PostedDate { get; set; }
        public DateTime? ClosingDate { get; set; }

        /// <summary>Toplam başvuru sayısı (özet için)</summary>
        public int? TotalApplications { get; set; }
    }

    // ────────────────────────────────────────────────────────────────────────
    // Handler
    // ────────────────────────────────────────────────────────────────────────
    public class GetMyJobPostingsQueryHandler : IRequestHandler<GetMyJobPostingsQuery, IEnumerable<MyJobPostingViewModel>>
    {
        private readonly IGenericRepositoryAsync<JobPosting> _jobPostingRepository;
        private readonly IAuthenticatedUserService _authenticatedUserService;

        public GetMyJobPostingsQueryHandler(
            IGenericRepositoryAsync<JobPosting> jobPostingRepository,
            IAuthenticatedUserService authenticatedUserService)
        {
            _jobPostingRepository = jobPostingRepository;
            _authenticatedUserService = authenticatedUserService;
        }

        public async Task<IEnumerable<MyJobPostingViewModel>> Handle(GetMyJobPostingsQuery request, CancellationToken cancellationToken)
        {
            var hiringManagerId = Guid.Parse(_authenticatedUserService.UserId);
            var all = await _jobPostingRepository.GetAllAsync();

            // Sadece bu İK'ya ait ilanları al
            var filtered = all.Where(j => j.HiringManagerId == hiringManagerId);

            // Durum filtresi
            if (!string.IsNullOrEmpty(request.StatusFilter) && request.StatusFilter != "All")
                filtered = filtered.Where(j => j.Status == request.StatusFilter);

            return filtered.Select(j => new MyJobPostingViewModel
            {
                Id              = j.Id,
                JobTitle        = j.JobTitle,
                Department      = j.Department,
                Location        = j.Location,
                WorkType        = j.WorkType,
                WorkModel       = j.WorkModel,
                AiScanEnabled   = j.AiScanEnabled,
                Status          = j.Status,
                IsDraft         = j.IsDraft,
                PostedDate      = j.PostedDate,
                ClosingDate     = j.ClosingDate,
                TotalApplications = null  // İleride navigation property ile hesaplanabilir
            });
        }
    }
}
