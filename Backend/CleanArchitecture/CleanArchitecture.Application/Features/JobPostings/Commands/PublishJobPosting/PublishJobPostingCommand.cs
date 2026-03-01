using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Core.Entities;
using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;

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

        public PublishJobPostingCommandHandler(IGenericRepositoryAsync<JobPosting> jobPostingRepository)
        {
            _jobPostingRepository = jobPostingRepository;
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
