using System;

namespace CleanArchitecture.Core.Entities
{
    public class FinalEvaluationScore : AuditableBaseEntity
    {
        public Guid ApplicationId { get; set; }
        public Guid JobPostingId { get; set; }
        public decimal? CvAnalysisScore { get; set; }
        public decimal? GeneralTestScore { get; set; }
        public decimal? AiInterviewScore { get; set; }
        public decimal? HrAssessmentScore { get; set; }
        public decimal? WeightedFinalScore { get; set; }
        public int? RankPosition { get; set; }
        public string EvaluationStatus { get; set; }
        public Guid? EvaluatedById { get; set; }
        public string EvaluationNotes { get; set; }
        public DateTime? EvaluatedAt { get; set; }
        public virtual JobApplication JobApplication { get; set; }
        public virtual JobPosting JobPosting { get; set; }
        public virtual User EvaluatedBy { get; set; }
    }
}
