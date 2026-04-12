using System;

namespace CleanArchitecture.Core.Entities
{
    public class JobApplication : AuditableBaseEntity
    {
        public Guid JobPostingId { get; set; }
        public Guid CandidateId { get; set; }
        public Guid? CvId { get; set; }
        public string CvUrl { get; set; }
        public string CoverLetter { get; set; }
        public string ApplicationStatus { get; set; }
        public DateTime AppliedAt { get; set; }

        // ── Pipeline tracking ─────────────────────────────────────────────
        /// <summary>
        /// Current stage in the automated pipeline.
        /// Values: NLP_REVIEW | SKILLS_TEST_PENDING | ENGLISH_TEST_PENDING |
        ///         AI_INTERVIEW_PENDING | COMPLETED |
        ///         REJECTED_NLP | REJECTED_SKILLS | REJECTED_ENGLISH | REJECTED_AI
        /// </summary>
        public string CurrentPipelineStage { get; set; } = "NLP_REVIEW";
        public DateTime? PipelineStageUpdatedAt { get; set; }
        public string RejectionReason { get; set; }

        public virtual JobPosting JobPosting { get; set; }
        public virtual CandidateProfile CandidateProfile { get; set; }
        public virtual CvUpload CvUpload { get; set; }
    }
}
