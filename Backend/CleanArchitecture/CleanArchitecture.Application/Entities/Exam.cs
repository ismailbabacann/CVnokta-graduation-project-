using System;
using System.Collections.Generic;

namespace CleanArchitecture.Core.Entities
{
    /// <summary>
    /// Represents an approved exam set for a job posting.
    /// One job can have multiple exams (technical, personality, case_study, etc.)
    /// </summary>
    public class Exam : AuditableBaseEntity
    {
        public Guid JobId { get; set; }

        /// <summary>Exam title e.g. "Backend Developer Technical Exam"</summary>
        public string Title { get; set; }

        /// <summary>technical | personality | case_study | general</summary>
        public string ExamType { get; set; }

        /// <summary>Optional ordering — which phase this exam belongs to</summary>
        public int? SequenceOrder { get; set; }

        /// <summary>Is this exam mandatory for this job posting?</summary>
        public bool IsMandatory { get; set; }

        /// <summary>draft | approved | archived</summary>
        public string Status { get; set; }

        /// <summary>Time limit in minutes; NULL = unlimited</summary>
        public int? TimeLimitMinutes { get; set; }

        /// <summary>UTC timestamp when HR approved this exam</summary>
        public DateTime? ApprovedAt { get; set; }

        // ── Navigation ──────────────────────────────────────────
        public virtual JobPosting Job { get; set; }
        public virtual ICollection<Question> Questions { get; set; }

        public Exam()
        {
            Questions = new List<Question>();
            Status = "draft";
        }
    }
}
