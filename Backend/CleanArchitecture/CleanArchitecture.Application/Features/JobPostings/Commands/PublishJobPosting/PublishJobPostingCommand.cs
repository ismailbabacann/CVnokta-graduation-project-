using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Core.Entities;
using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;

namespace CleanArchitecture.Core.Features.JobPostings.Commands.PublishJobPosting
{
    /// <summary>
    /// Publishes a job posting that is currently in Draft status.
    /// Used via the "Publish This Job" button or transitioning from draft to active.
    /// </summary>
    public class PublishJobPostingCommand : IRequest<PublishJobPostingResponse>
    {
        /// <summary>ID of the job posting to publish.</summary>
        public Guid Id { get; set; }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Handler
    // ──────────────────────────────────────────────────────────────────────────
    public class PublishJobPostingCommandHandler : IRequestHandler<PublishJobPostingCommand, PublishJobPostingResponse>
    {
        private readonly IGenericRepositoryAsync<JobPosting> _jobPostingRepository;
        private readonly Microsoft.Extensions.DependencyInjection.IServiceScopeFactory _serviceScopeFactory;

        public PublishJobPostingCommandHandler(
            IGenericRepositoryAsync<JobPosting> jobPostingRepository,
            Microsoft.Extensions.DependencyInjection.IServiceScopeFactory serviceScopeFactory)
        {
            _jobPostingRepository = jobPostingRepository;
            _serviceScopeFactory = serviceScopeFactory;
        }

        public async Task<PublishJobPostingResponse> Handle(PublishJobPostingCommand request, CancellationToken cancellationToken)
        {
            var jobPosting = await _jobPostingRepository.GetByIdAsync(request.Id);

            if (jobPosting == null)
                return new PublishJobPostingResponse { Success = false, Message = "Job posting not found." };

            if (jobPosting.Status == "Active")
                return new PublishJobPostingResponse { Success = false, Message = "Job posting is already published." };

            jobPosting.Status   = "Active";
            jobPosting.IsDraft  = false;
            jobPosting.PostedDate = DateTime.UtcNow;

            await _jobPostingRepository.UpdateAsync(jobPosting);

            var title = jobPosting.JobTitle;
            var reqSkills = jobPosting.RequiredSkills;
            var loc = jobPosting.Location;
            var resp = jobPosting.Responsibilities;
            var reqQual = jobPosting.RequiredQualifications;

            // Extract stats
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

            return new PublishJobPostingResponse
            {
                Success = true,
                Id      = jobPosting.Id,
                Status  = jobPosting.Status,
                Message = "Job posting published successfully."
            };
        }
    }
}
