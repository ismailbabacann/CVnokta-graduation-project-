using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.JobPostings.Queries.GetDashboardSummary
{
    public class JobDashboardSummaryDto
    {
        public int TotalApplications { get; set; }
        public int HighMatchNlpCount { get; set; }
        public int ActivePostingsCount { get; set; }
        public int PendingEvaluationsCount { get; set; }
    }

    public class GetDashboardSummaryQuery : IRequest<JobDashboardSummaryDto>
    {
    }

    public class GetDashboardSummaryQueryHandler : IRequestHandler<GetDashboardSummaryQuery, JobDashboardSummaryDto>
    {
        private readonly IGenericRepositoryAsync<JobApplication> _applicationRepo;
        private readonly IGenericRepositoryAsync<JobPosting> _jobRepo;
        private readonly IGenericRepositoryAsync<CandidateRankingView> _rankingRepo;

        public GetDashboardSummaryQueryHandler(
            IGenericRepositoryAsync<JobApplication> applicationRepo,
            IGenericRepositoryAsync<JobPosting> jobRepo,
            IGenericRepositoryAsync<CandidateRankingView> rankingRepo)
        {
            _applicationRepo = applicationRepo;
            _jobRepo = jobRepo;
            _rankingRepo = rankingRepo;
        }

        public async Task<JobDashboardSummaryDto> Handle(GetDashboardSummaryQuery request, CancellationToken cancellationToken)
        {
            var apps = await _applicationRepo.GetAllAsync();
            var jobs = await _jobRepo.GetAllAsync();
            var rankings = await _rankingRepo.GetAllAsync();

            var totalApps = apps.Count;
            var activeJobs = jobs.Count(j => j.Status == "Active");
            var pending = apps.Count(a => a.ApplicationStatus == "SUBMITTED" || a.ApplicationStatus == "CV_REVIEW");
            var highMatch = rankings.Count(r => r.CvAnalysisScore != null && r.CvAnalysisScore >= 80);

            return new JobDashboardSummaryDto
            {
                TotalApplications = totalApps,
                ActivePostingsCount = activeJobs,
                PendingEvaluationsCount = pending,
                HighMatchNlpCount = highMatch
            };
        }
    }
}
