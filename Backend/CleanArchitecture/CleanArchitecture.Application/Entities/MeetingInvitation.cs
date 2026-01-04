using System;

namespace CleanArchitecture.Core.Entities
{
    public class MeetingInvitation : AuditableBaseEntity
    {
        public int ApplicationId { get; set; }
        public int JobPostingId { get; set; }
        public int CandidateId { get; set; }
        public string MeetingType { get; set; }
        public string MeetingLink { get; set; }
        public string MeetingTitle { get; set; }
        public DateTime? ScheduledDate { get; set; }
        public int? DurationMinutes { get; set; }
        public int CreatedById { get; set; }
        public string InvitationStatus { get; set; }
        public DateTime SentAt { get; set; }
        public DateTime? AcceptedAt { get; set; }
        public string Notes { get; set; }
        public virtual JobApplication JobApplication { get; set; }
        public virtual JobPosting JobPosting { get; set; }
        public virtual CandidateProfile CandidateProfile { get; set; }
        public virtual User CreatedBy { get; set; }
    }
}
