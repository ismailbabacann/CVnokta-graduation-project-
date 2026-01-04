using System;

namespace CleanArchitecture.Core.Entities
{
    public class AiInterviewSession : AuditableBaseEntity
    {
        public Guid ApplicationId { get; set; }
        public Guid StageId { get; set; }
        public Guid CvId { get; set; }
        public Guid JobPostingId { get; set; }
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
