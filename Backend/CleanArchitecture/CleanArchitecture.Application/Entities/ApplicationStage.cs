using System;

namespace CleanArchitecture.Core.Entities
{
    public class ApplicationStage : AuditableBaseEntity
    {
        public Guid ApplicationId { get; set; }
        public Guid JobPostingId { get; set; }
        public string StageType { get; set; }
        public string StageStatus { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public Guid? ReviewerId { get; set; }
        public string Notes { get; set; }
        public bool? IsPassed { get; set; }
        public virtual JobApplication JobApplication { get; set; }
        public virtual JobPosting JobPosting { get; set; }
        public virtual User Reviewer { get; set; }
    }
}
