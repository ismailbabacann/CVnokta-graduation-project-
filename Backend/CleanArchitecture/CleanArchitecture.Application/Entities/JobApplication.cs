using System;

namespace CleanArchitecture.Core.Entities
{
    public class JobApplication : AuditableBaseEntity
    {
        public Guid JobPostingId { get; set; }
        public Guid CandidateId { get; set; }
        public Guid? CvId { get; set; }
        public string CoverLetter { get; set; }
        public string ApplicationStatus { get; set; }
        public DateTime AppliedAt { get; set; }
        public virtual JobPosting JobPosting { get; set; }
        public virtual CandidateProfile CandidateProfile { get; set; }
        public virtual CvUpload CvUpload { get; set; }
    }
}
