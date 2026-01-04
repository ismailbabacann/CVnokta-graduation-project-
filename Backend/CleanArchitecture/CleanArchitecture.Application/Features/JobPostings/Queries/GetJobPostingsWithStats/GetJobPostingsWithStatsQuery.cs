using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.JobPostings.Queries.GetJobPostingsWithStats
{
    // İK panelinde ilanları ve başvuru istatistiklerini listelemek için kullanılır.
    public class GetJobPostingsWithStatsQuery : IRequest<IEnumerable<JobPostingStatsViewModel>>
    {
        public int HiringManagerId { get; set; }
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
        // Ideally we would inject specialized repository or use Dapper/EF directly for aggregation.
        // For current scope: Fetch all and count in memory (not efficient but functional for demo) or return dummy.
        // Let's implement in-memory counting using related entities if navigation properties are loaded, 
        // OR better: use the ActiveJobPostingsView if it has stats (it does: TotalApplications etc.).
        
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
                    InterviewCount = v.InEvaluation ?? 0 // Approximation
                });
            }
            return result;
        }
    }
}
