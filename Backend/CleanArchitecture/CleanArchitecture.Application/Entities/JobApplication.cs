using System;

namespace CleanArchitecture.Core.Entities
{
    public class JobApplication : AuditableBaseEntity
    {
        public int JobPostingId { get; set; }
        public int CandidateId { get; set; }
        public int? CvId { get; set; }
        public string CoverLetter { get; set; }
        public string ApplicationStatus { get; set; }
        public DateTime AppliedAt { get; set; }
        public virtual JobPosting JobPosting { get; set; }
        public virtual CandidateProfile CandidateProfile { get; set; }
        public virtual CvUpload CvUpload { get; set; }
    }
}
