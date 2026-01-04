using System;

namespace CleanArchitecture.Core.Entities
{
    public class CandidateRankingView : BaseEntity
    {
        public int JobPostingId { get; set; }
        public int CandidateId { get; set; }
        public int ApplicationId { get; set; }
        public string CandidateFullName { get; set; }
        public decimal? CvAnalysisScore { get; set; }
        public decimal? GeneralTestScore { get; set; }
        public decimal? AiInterviewScore { get; set; }
        public decimal? FinalWeightedScore { get; set; }
        public int? RankPosition { get; set; }
        public string ApplicationStatus { get; set; }
        public DateTime? LastUpdated { get; set; }
    }
}
