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

        public GetCandidatePoolStatsQueryHandler(
            IGenericRepositoryAsync<JobApplication> applicationRepository,
            IGenericRepositoryAsync<CandidateRankingView> rankingRepository)
        {
            _applicationRepository = applicationRepository;
            _rankingRepository = rankingRepository;
        }

        public async Task<CandidatePoolStatsDto> Handle(GetCandidatePoolStatsQuery request, CancellationToken cancellationToken)
        {
            try 
            {
                var apps = await _applicationRepository.GetAllAsync();
                var rankings = await _rankingRepository.GetAllAsync();

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
