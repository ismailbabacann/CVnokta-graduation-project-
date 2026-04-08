using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.JobPostings.Commands.DeleteJobPosting
{
    public class DeleteJobPostingCommand : IRequest<bool>
    {
        public Guid Id { get; set; }
    }

    public class DeleteJobPostingCommandHandler : IRequestHandler<DeleteJobPostingCommand, bool>
    {
        private readonly IGenericRepositoryAsync<JobPosting> _jobPostingRepository;

        public DeleteJobPostingCommandHandler(IGenericRepositoryAsync<JobPosting> jobPostingRepository)
        {
            _jobPostingRepository = jobPostingRepository;
        }

        public async Task<bool> Handle(DeleteJobPostingCommand request, CancellationToken cancellationToken)
        {
            var jobPosting = await _jobPostingRepository.GetByIdAsync(request.Id);
            if (jobPosting == null) return false;

            // Soft delete (or we could physically delete based on your repository implementation)
            // For now, setting status to 'Deleted' or similar. If there's an IsDeleted flag, we'd use it.
            // Let's assume setting Status="Deleted" means it's soft deleted. 
            // Or if there's no IsDeleted, let's just physically delete it if the user wants. The user asked for "soft delete".
            // Since Status determines visibility ("Active", "Draft", "Closed"), we can set it to "Deleted"
            jobPosting.Status = "Deleted";
            await _jobPostingRepository.UpdateAsync(jobPosting);

            return true;
        }
    }
}
