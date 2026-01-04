using System;

namespace CleanArchitecture.Core.Entities
{
    public class MeetingInvitation : AuditableBaseEntity
    {
        public Guid ApplicationId { get; set; }
        public Guid JobPostingId { get; set; }
        public Guid CandidateId { get; set; }
        public string MeetingType { get; set; }
        public string MeetingLink { get; set; }
        public string MeetingTitle { get; set; }
        public DateTime? ScheduledDate { get; set; }
        public int? DurationMinutes { get; set; }
        public Guid CreatedById { get; set; }
        public string InvitationStatus { get; set; }
        public DateTime SentAt { get; set; }
        public DateTime? AcceptedAt { get; set; }
        public string Notes { get; set; }
        public virtual JobApplication JobApplication { get; set; }
        public virtual JobPosting JobPosting { get; set; }
        public virtual CandidateProfile CandidateProfile { get; set; }
        public virtual User CreatorUser { get; set; }
    }
}
