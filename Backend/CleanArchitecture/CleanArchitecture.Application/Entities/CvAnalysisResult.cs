using System;

namespace CleanArchitecture.Core.Entities
{
    public class CvAnalysisResult : AuditableBaseEntity
    {
        public Guid ApplicationId { get; set; }
        public Guid StageId { get; set; }
        public Guid CvId { get; set; }
        public decimal? AnalysisScore { get; set; }
        public string MatchingSkills { get; set; }
        public string MissingSkills { get; set; }
        public decimal? ExperienceMatchScore { get; set; }
        public decimal? EducationMatchScore { get; set; }
        public string OverallAssessment { get; set; }
        public Guid? AnalyzedById { get; set; }
        public DateTime AnalysisDate { get; set; }
        public bool? IsPassed { get; set; }
        public string ReviewerNotes { get; set; }
        public virtual JobApplication JobApplication { get; set; }
        public virtual ApplicationStage Stage { get; set; }
        public virtual CvUpload CvUpload { get; set; }
        public virtual User AnalyzedBy { get; set; }
    }
}
