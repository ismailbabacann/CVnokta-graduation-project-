using System;
using System.Collections.Generic;

namespace CleanArchitecture.Core.Entities
{
    /// <summary>
    /// Represents an approved exam set for a job posting.
    /// One job can have multiple exams ordered by SequenceOrder (stage 1 = English, stage 2 = Technical).
    /// </summary>
    public class Exam : AuditableBaseEntity
    {
        public Guid JobId { get; set; }

        /// <summary>Exam title e.g. "Backend Developer Technical Exam"</summary>
        public string Title { get; set; }

        /// <summary>english | technical | personality | case_study | general</summary>
        public string ExamType { get; set; }

        /// <summary>Phase order: 1 = English/Stage1, 2 = Technical/Stage2</summary>
        public int? SequenceOrder { get; set; }

        /// <summary>Is this exam mandatory for this job posting?</summary>
        public bool IsMandatory { get; set; }

        /// <summary>draft | approved | archived</summary>
        public string Status { get; set; }

        /// <summary>Time limit in minutes; NULL = unlimited</summary>
        public int? TimeLimitMinutes { get; set; }

        /// <summary>UTC timestamp when HR approved this exam</summary>
        public DateTime? ApprovedAt { get; set; }

        /// <summary>
        /// Minimum percentage score (0-100) required to pass this exam and advance to next stage.
        /// e.g. 75 means candidate must score >= 75% to pass.
        /// If NULL, uses JobPosting.PipelinePassThreshold.
        /// </summary>
        public int? PassThreshold { get; set; }

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
