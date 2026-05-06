using System;

namespace CleanArchitecture.Core.Entities
{
    public class CandidateRankingView
    {
        public Guid JobPostingId { get; set; }
        public Guid CandidateId { get; set; }
        public Guid ApplicationId { get; set; }
        public string CandidateFullName { get; set; }
        public string Email { get; set; }
        public string CvUrl { get; set; }
        public decimal? CvAnalysisScore { get; set; }
        public decimal? GeneralTestScore { get; set; }
        public decimal? SkillsTestScore { get; set; }
        public decimal? EnglishTestScore { get; set; }
        public decimal? AiInterviewScore { get; set; }
        public decimal? FinalWeightedScore { get; set; }
        public int? RankPosition { get; set; }
        public string ApplicationStatus { get; set; }
        public string CurrentPipelineStage { get; set; }
        public DateTime? LastUpdated { get; set; }
        public DateTime? ApplicationDate { get; set; }
        public string Location { get; set; }
        public string LinkedInProfile { get; set; }
        public string CoverLetter { get; set; }
    }
}
