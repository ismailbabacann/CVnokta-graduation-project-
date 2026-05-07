using AutoMapper;
using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Core.Entities;
using MediatR;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;

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

        /// <summary>Required Skills (comma-separated). Used for AI CV scoring.</summary>
        public string RequiredSkills { get; set; }

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
        public string LanguageLevel { get; set; }
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
        private readonly Microsoft.Extensions.DependencyInjection.IServiceScopeFactory _serviceScopeFactory;

        public CreateJobPostingCommandHandler(
            IGenericRepositoryAsync<JobPosting> jobPostingRepository,
            IMapper mapper,
            IAuthenticatedUserService authenticatedUserService,
            Microsoft.Extensions.DependencyInjection.IServiceScopeFactory serviceScopeFactory)
        {
            _jobPostingRepository = jobPostingRepository;
            _mapper = mapper;
            _authenticatedUserService = authenticatedUserService;
            _serviceScopeFactory = serviceScopeFactory;
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

            // Extract stats if the job is being published immediately
            if (!request.SaveAsDraft)
            {
                var title = jobPosting.JobTitle;
                var reqSkills = jobPosting.RequiredSkills;
                var loc = jobPosting.Location;
                var resp = jobPosting.Responsibilities;
                var reqQual = jobPosting.RequiredQualifications;

                _ = Task.Run(async () =>
                {
                    try
                    {
                        using var scope = _serviceScopeFactory.CreateScope();
                        var aiService = scope.ServiceProvider.GetRequiredService<CleanArchitecture.Application.Interfaces.IAiJobPostingGenerationService>();
                        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

                        var stats = await aiService.ExtractJobStatsAsync(title, reqSkills, loc, resp, reqQual);

                        if (stats.Skills?.Count > 0)
                            await mediator.Send(new CleanArchitecture.Core.Features.MarketStats.Commands.UpdateSkillStats.UpdateSkillStatsCommand { Skills = stats.Skills });

                        if (stats.Positions?.Count > 0)
                            await mediator.Send(new CleanArchitecture.Core.Features.MarketStats.Commands.UpdatePositionStats.UpdatePositionStatsCommand { Positions = stats.Positions });

                        if (stats.Locations?.Count > 0)
                            await mediator.Send(new CleanArchitecture.Core.Features.MarketStats.Commands.UpdateLocationStats.UpdateLocationStatsCommand { Locations = stats.Locations });
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[Stats Extraction Background Task Failed] {ex.Message}");
                    }
                });
            }

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
