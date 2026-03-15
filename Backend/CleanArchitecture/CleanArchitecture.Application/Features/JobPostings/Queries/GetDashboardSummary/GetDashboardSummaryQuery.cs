using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
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
        private readonly IAuthenticatedUserService _authenticatedUserService;

        public GetDashboardSummaryQueryHandler(
            IGenericRepositoryAsync<JobApplication> applicationRepo,
            IGenericRepositoryAsync<JobPosting> jobRepo,
            IGenericRepositoryAsync<CandidateRankingView> rankingRepo,
            IAuthenticatedUserService authenticatedUserService)
        {
            _applicationRepo = applicationRepo;
            _jobRepo = jobRepo;
            _rankingRepo = rankingRepo;
            _authenticatedUserService = authenticatedUserService;
        }

        public async Task<JobDashboardSummaryDto> Handle(GetDashboardSummaryQuery request, CancellationToken cancellationToken)
        {
            var allApps = await _applicationRepo.GetAllAsync();
            var allJobs = await _jobRepo.GetAllAsync();
            var allRankings = await _rankingRepo.GetAllAsync();

            var currentUserId = Guid.Parse(_authenticatedUserService.UserId);

            // Filter jobs created by this HR
            var myJobs = allJobs.Where(j => j.HiringManagerId == currentUserId).ToList();
            var myJobIds = myJobs.Select(j => j.Id).ToHashSet();

            // Filter applications and rankings that belong to this HR's jobs
            var myApps = allApps.Where(a => myJobIds.Contains(a.JobPostingId)).ToList();
            var myRankings = allRankings.Where(r => myJobIds.Contains(r.JobPostingId)).ToList();

            var totalApps = myApps.Count;
            var activeJobs = myJobs.Count(j => j.Status == "Active");
            var pending = myApps.Count(a => a.ApplicationStatus == "SUBMITTED" || a.ApplicationStatus == "CV_REVIEW");
            var highMatch = myRankings.Count(r => r.CvAnalysisScore != null && r.CvAnalysisScore >= 80);

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
