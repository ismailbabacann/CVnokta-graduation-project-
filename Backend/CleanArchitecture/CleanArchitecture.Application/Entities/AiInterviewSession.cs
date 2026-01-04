using System;

namespace CleanArchitecture.Core.Entities
{
    public class AiInterviewSession : AuditableBaseEntity
    {
        public int ApplicationId { get; set; }
        public int StageId { get; set; }
        public int CvId { get; set; }
        public int JobPostingId { get; set; }
        public string SessionStatus { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public int? DurationSeconds { get; set; }
        public string AiAgentVersion { get; set; }
        public virtual JobApplication JobApplication { get; set; }
        public virtual ApplicationStage Stage { get; set; }
        public virtual CvUpload CvUpload { get; set; }
        public virtual JobPosting JobPosting { get; set; }
    }
}
