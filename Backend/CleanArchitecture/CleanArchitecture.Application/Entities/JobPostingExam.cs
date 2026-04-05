using System;
using System.Collections.Generic;

namespace CleanArchitecture.Core.Entities
{
    public class JobPostingExam : AuditableBaseEntity
    {
        public Guid JobPostingId { get; set; }
        public virtual JobPosting JobPosting { get; set; }

        public string Title { get; set; }
        public string Description { get; set; }

        public virtual ICollection<ExamQuestion> Questions { get; set; }

        public JobPostingExam()
        {
            Questions = new List<ExamQuestion>();
        }
    }
}
