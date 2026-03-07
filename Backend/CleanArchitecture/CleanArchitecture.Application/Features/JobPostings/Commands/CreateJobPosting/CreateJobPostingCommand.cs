using AutoMapper;
using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Core.Entities;
using MediatR;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.JobPostings.Commands.CreateJobPosting
{
    /// <summary>
    /// Allows HR users to create a new job posting.
    /// Carries all fields from the "Create New Job Posting" page.
    /// </summary>
    public class CreateJobPostingCommand : IRequest<CreateJobPostingResponse>
    {
        // ── Basic Information ────────────────────────────────────────────────
        /// <summary>Job title. E.g.: "Senior Software Engineer"</summary>
        public string JobTitle { get; set; }

        /// <summary>Department. E.g.: "Engineering"</summary>
        public string Department { get; set; }

        /// <summary>Location. E.g.: "Istanbul / Maslak"</summary>
        public string Location { get; set; }

        /// <summary>Work Type: "FullTime" | "PartTime" | "Contract" | "Internship"</summary>
        public string WorkType { get; set; }

        /// <summary>Work Model: "Remote" | "Hybrid" | "OnSite"</summary>
        public string WorkModel { get; set; }

        // ── Job Details ─────────────────────────────────────────────────────
        /// <summary>About Us / Company introduction text</summary>
        public string AboutCompany { get; set; }

        /// <summary>About Role text</summary>
        public string AboutRole { get; set; }

        /// <summary>Responsibilities (rich text / HTML supported)</summary>
        public string Responsibilities { get; set; }

        /// <summary>Required Qualifications (rich text / HTML supported)</summary>
        public string RequiredQualifications { get; set; }

        // ── AI Assistant Settings ────────────────────────────────────────────
        /// <summary>Enable AI CV scanning</summary>
        public bool AiScanEnabled { get; set; }

        /// <summary>Minimum match score (0-100). E.g.: 70</summary>
        public int MinMatchScore { get; set; } = 70;

        /// <summary>Send automatic interview invitation to qualified candidates</summary>
        public bool AutoEmailEnabled { get; set; }

        // ── Benefits ────────────────────────────────────────────────────────
        /// <summary>Selected benefits list. E.g.: ["Private Health Insurance", "Meal Card"]</summary>
        public List<string> Benefits { get; set; } = new List<string>();

        // ── Additional Info ──────────────────────────────────────────────────
        public decimal? SalaryMin { get; set; }
        public decimal? SalaryMax { get; set; }
        public int TotalPositions { get; set; } = 1;
        public DateTime? ClosingDate { get; set; }

        /// <summary>
        /// true → "Save as Draft" button was clicked (Status = Draft).
        /// false → "Publish This Job" button was clicked (Status = Active).
        /// </summary>
        public bool SaveAsDraft { get; set; }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Handler
    // ──────────────────────────────────────────────────────────────────────────
    public class CreateJobPostingCommandHandler : IRequestHandler<CreateJobPostingCommand, CreateJobPostingResponse>
    {
        private readonly IGenericRepositoryAsync<JobPosting> _jobPostingRepository;
        private readonly IMapper _mapper;
        private readonly IAuthenticatedUserService _authenticatedUserService;

        public CreateJobPostingCommandHandler(
            IGenericRepositoryAsync<JobPosting> jobPostingRepository,
            IMapper mapper,
            IAuthenticatedUserService authenticatedUserService)
        {
            _jobPostingRepository = jobPostingRepository;
            _mapper = mapper;
            _authenticatedUserService = authenticatedUserService;
        }

        public async Task<CreateJobPostingResponse> Handle(CreateJobPostingCommand request, CancellationToken cancellationToken)
        {
            var jobPosting = _mapper.Map<JobPosting>(request);

            // Status: Draft or Active?
            jobPosting.Status    = request.SaveAsDraft ? "Draft" : "Active";
            jobPosting.IsDraft   = request.SaveAsDraft;
            jobPosting.PostedDate = DateTime.UtcNow;

            // Convert benefits list to comma-separated string
            jobPosting.Benefits = request.Benefits != null
                ? string.Join(",", request.Benefits)
                : string.Empty;

            // ID of the currently logged-in HR user
            jobPosting.HiringManagerId = Guid.Parse(_authenticatedUserService.UserId);

            await _jobPostingRepository.AddAsync(jobPosting);

            return new CreateJobPostingResponse
            {
                Id       = jobPosting.Id,
                Status   = jobPosting.Status,
                IsDraft  = jobPosting.IsDraft,
                Message  = request.SaveAsDraft
                    ? "Job posting saved as draft."
                    : "Job posting published successfully."
            };
        }
    }
}
