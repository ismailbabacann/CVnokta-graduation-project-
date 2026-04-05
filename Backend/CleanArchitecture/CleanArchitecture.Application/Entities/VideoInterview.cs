using System;
using System.Collections.Generic;

namespace CleanArchitecture.Core.Entities
{
    public class VideoInterview : AuditableBaseEntity
    {
        public string ExternalInterviewId { get; set; }

        public Guid CandidateId { get; set; }
        public virtual CandidateProfile Candidate { get; set; }

        public Guid JobPostingId { get; set; }
        public virtual JobPosting JobPosting { get; set; }

        public string Status { get; set; }

        public virtual ICollection<VideoInterviewQa> Questions { get; set; }

        public VideoInterview()
        {
            Questions = new List<VideoInterviewQa>();
        }
    }
}
