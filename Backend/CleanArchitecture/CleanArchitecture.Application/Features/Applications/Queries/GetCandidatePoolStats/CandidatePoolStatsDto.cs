namespace CleanArchitecture.Core.Features.Applications.Queries.GetCandidatePoolStats
{
    public class CandidatePoolStatsDto
    {
        public int TotalCandidates { get; set; }
        public int NewApplicationsToday { get; set; }
        public decimal AverageNlpScore { get; set; }
    }
}
