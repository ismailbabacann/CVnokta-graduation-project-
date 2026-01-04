using AutoMapper;
using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Core.Entities;
using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.JobPostings.Commands.CreateJobPosting
{
    // İK'nın yeni bir iş ilanı oluşturmasını sağlar.
    public class CreateJobPostingCommand : IRequest<Guid>
    {
        public string JobTitle { get; set; }
        public string JobDescription { get; set; }
        public string Department { get; set; }
        public decimal? SalaryMin { get; set; }
        public decimal? SalaryMax { get; set; }
        public DateTime ClosingDate { get; set; }
    }

    public class CreateJobPostingCommandHandler : IRequestHandler<CreateJobPostingCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<JobPosting> _jobPostingRepository;
        private readonly IMapper _mapper;
        private readonly IAuthenticatedUserService _authenticatedUserService;

        public CreateJobPostingCommandHandler(IGenericRepositoryAsync<JobPosting> jobPostingRepository, IMapper mapper, IAuthenticatedUserService authenticatedUserService)
        {
            _jobPostingRepository = jobPostingRepository;
            _mapper = mapper;
            _authenticatedUserService = authenticatedUserService;
        }

        public async Task<Guid> Handle(CreateJobPostingCommand request, CancellationToken cancellationToken)
        {
            var jobPosting = _mapper.Map<JobPosting>(request);
            jobPosting.Status = "Active"; 
            jobPosting.PostedDate = DateTime.UtcNow;
            
            // HiringManagerId is now Guid, matching Domain User
            jobPosting.HiringManagerId = Guid.Parse(_authenticatedUserService.UserId);

            await _jobPostingRepository.AddAsync(jobPosting);
            return jobPosting.Id;
        }
    }
}
