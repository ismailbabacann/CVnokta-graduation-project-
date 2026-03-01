using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.JobPostings.Queries.GetJobPostingsWithStats
{
    // Used to list job postings and application statistics in the HR dashboard.
    public class GetJobPostingsWithStatsQuery : IRequest<IEnumerable<JobPostingStatsViewModel>>
    {
        // Optional: if left empty, all postings are returned
        public Guid? HiringManagerId { get; set; }
    }

    public class JobPostingStatsViewModel 
    {
        public int JobId { get; set; }
        public string Title { get; set; }
        public int AppliedCount { get; set; }
        public int InterviewCount { get; set; }
    }

    public class GetJobPostingsWithStatsQueryHandler : IRequestHandler<GetJobPostingsWithStatsQuery, IEnumerable<JobPostingStatsViewModel>>
    {
        private readonly IGenericRepositoryAsync<JobPosting> _jobRepository;

        
        private readonly IGenericRepositoryAsync<ActiveJobPostingsView> _viewRepository;

        public GetJobPostingsWithStatsQueryHandler(IGenericRepositoryAsync<ActiveJobPostingsView> viewRepository)
        {
            _viewRepository = viewRepository;
        }

        public async Task<IEnumerable<JobPostingStatsViewModel>> Handle(GetJobPostingsWithStatsQuery request, CancellationToken cancellationToken)
        {
            var views = await _viewRepository.GetAllAsync();
            var result = new List<JobPostingStatsViewModel>();
            
            foreach(var v in views)
            {
                result.Add(new JobPostingStatsViewModel
                {
                    JobId = v.JobPostingId,
                    Title = v.JobTitle,
                    AppliedCount = v.TotalApplications ?? 0,
                    InterviewCount = v.InEvaluation ?? 0 
                });
            }
            return result;
        }
    }
}
