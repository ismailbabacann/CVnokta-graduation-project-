using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.JobPostings.Commands.UpdateJobPostingStatus
{
    // İK'nın bir ilanı aktif veya pasif duruma getirmesini sağlar.
    public class UpdateJobPostingStatusCommand : IRequest<bool>
    {
        public Guid Id { get; set; }
        public bool IsActive { get; set; }
    }

    public class UpdateJobPostingStatusCommandHandler : IRequestHandler<UpdateJobPostingStatusCommand, bool>
    {
        private readonly IGenericRepositoryAsync<JobPosting> _jobPostingRepository;

        public UpdateJobPostingStatusCommandHandler(IGenericRepositoryAsync<JobPosting> jobPostingRepository)
        {
            _jobPostingRepository = jobPostingRepository;
        }

        public async Task<bool> Handle(UpdateJobPostingStatusCommand request, CancellationToken cancellationToken)
        {
            var jobPosting = await _jobPostingRepository.GetByIdAsync(request.Id);
            if (jobPosting == null) return false;

            jobPosting.Status = request.IsActive ? "Active" : "Closed";
            await _jobPostingRepository.UpdateAsync(jobPosting);
            return true;
        }
    }
}
