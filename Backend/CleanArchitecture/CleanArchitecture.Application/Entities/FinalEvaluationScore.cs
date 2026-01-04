using System;

namespace CleanArchitecture.Core.Entities
{
    public class FinalEvaluationScore : AuditableBaseEntity
    {
        public int ApplicationId { get; set; }
        public int JobPostingId { get; set; }
        public decimal? CvAnalysisScore { get; set; }
        public decimal? GeneralTestScore { get; set; }
        public decimal? AiInterviewScore { get; set; }
        public decimal? HrAssessmentScore { get; set; }
        public decimal? WeightedFinalScore { get; set; }
        public int? RankPosition { get; set; }
        public string EvaluationStatus { get; set; }
        public int? EvaluatedById { get; set; }
        public string EvaluationNotes { get; set; }
        public DateTime? EvaluatedAt { get; set; }
        public virtual JobApplication JobApplication { get; set; }
        public virtual JobPosting JobPosting { get; set; }
        public virtual User EvaluatedBy { get; set; }
    }
}
