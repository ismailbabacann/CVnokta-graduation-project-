using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Applications.Queries.GetCandidatePoolStats
{
    public class GetCandidatePoolStatsQueryHandler : IRequestHandler<GetCandidatePoolStatsQuery, CandidatePoolStatsDto>
    {
        private readonly IGenericRepositoryAsync<JobApplication> _applicationRepository;
        private readonly IGenericRepositoryAsync<CandidateRankingView> _rankingRepository;
        private readonly IGenericRepositoryAsync<JobPosting> _jobPostingRepository;
        private readonly IAuthenticatedUserService _authenticatedUserService;

        public GetCandidatePoolStatsQueryHandler(
            IGenericRepositoryAsync<JobApplication> applicationRepository,
            IGenericRepositoryAsync<CandidateRankingView> rankingRepository,
            IGenericRepositoryAsync<JobPosting> jobPostingRepository,
            IAuthenticatedUserService authenticatedUserService)
        {
            _applicationRepository = applicationRepository;
            _rankingRepository = rankingRepository;
            _jobPostingRepository = jobPostingRepository;
            _authenticatedUserService = authenticatedUserService;
        }

        public async Task<CandidatePoolStatsDto> Handle(GetCandidatePoolStatsQuery request, CancellationToken cancellationToken)
        {
            try 
            {
                var allApps = await _applicationRepository.GetAllAsync();
                var allRankings = await _rankingRepository.GetAllAsync();
                var allJobs = await _jobPostingRepository.GetAllAsync();

                var currentUserId = Guid.Parse(_authenticatedUserService.UserId);

                // Filter jobs by logged in hiring manager
                var myJobIds = allJobs.Where(j => j.HiringManagerId == currentUserId).Select(j => j.Id).ToHashSet();

                var apps = allApps.Where(a => myJobIds.Contains(a.JobPostingId)).ToList();
                var rankings = allRankings.Where(r => myJobIds.Contains(r.JobPostingId)).ToList();

                var totalCandidates = apps.Select(a => a.CandidateId).Distinct().Count();
                
                var today = DateTime.UtcNow.Date;
                var newApplicationsToday = apps.Count(a => a.AppliedAt.Date == today);

                var validScores = rankings.Where(r => r.CvAnalysisScore.HasValue).Select(r => r.CvAnalysisScore.Value).ToList();
                var averageNlpScore = validScores.Any() ? validScores.Average() : 0m;

                return new CandidatePoolStatsDto
                {
                    TotalCandidates = totalCandidates,
                    NewApplicationsToday = newApplicationsToday,
                    AverageNlpScore = Math.Round(averageNlpScore, 1)
                };
            }
            catch (Exception ex)
            {
                throw new Exception($"GetCandidatePoolStats ERROR: {ex.Message} --- INNER: {ex.InnerException?.Message}", ex);
            }
        }
    }
}
