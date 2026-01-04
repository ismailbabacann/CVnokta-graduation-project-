using System;

namespace CleanArchitecture.Core.Entities
{
    public class AiInterviewSummary : AuditableBaseEntity
    {
        public Guid SessionId { get; set; }
        public Guid ApplicationId { get; set; }
        public int? TotalQuestionsAsked { get; set; }
        public int? TotalQuestionsAnswered { get; set; }
        public decimal? AverageConfidenceScore { get; set; }
        public decimal? JobMatchScore { get; set; }
        public decimal? ExperienceAlignmentScore { get; set; }
        public decimal? CommunicationScore { get; set; }
        public decimal? TechnicalKnowledgeScore { get; set; }
        public decimal? OverallInterviewScore { get; set; }
        public string SummaryText { get; set; }
        public string Strengths { get; set; }
        public string Weaknesses { get; set; }
        public string Recommendations { get; set; }
        public bool? IsPassed { get; set; }
        public virtual AiInterviewSession Session { get; set; }
        public virtual JobApplication JobApplication { get; set; }
    }
}
