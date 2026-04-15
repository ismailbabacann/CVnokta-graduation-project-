using System;
using System.Collections.Generic;

namespace CleanArchitecture.Core.Entities
{
    /// <summary>
    /// Represents one (candidate × exam) assignment.
    /// A candidate assigned to 3 exams will have 3 rows, each with its own token.
    /// Unique constraint: (CandidateId, ExamId)
    /// </summary>
    public class CandidateExamAssignment : AuditableBaseEntity
    {
        public Guid CandidateId { get; set; }           // FK → CandidateProfile
        public Guid ExamId { get; set; }                // FK → Exam
        public Guid JobId { get; set; }                 // Denormalized FK → JobPosting (fast queries)

        /// <summary>Cryptographic unique token for accessing this exam</summary>
        public string Token { get; set; }

        /// <summary>Groups all assignments created in the same /assign call</summary>
        public Guid? AssignmentBatchId { get; set; }

        /// <summary>pending | opened | in_progress | submitted | expired</summary>
        public string Status { get; set; }

        public DateTime? SentAt { get; set; }
        public DateTime? OpenedAt { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }

        /// <summary>Calculated total score after submission</summary>
        public decimal? Score { get; set; }

        // ── Navigation ──────────────────────────────────────────
        public virtual CandidateProfile Candidate { get; set; }
        public virtual Exam Exam { get; set; }
        public virtual JobPosting Job { get; set; }
        public virtual ICollection<CandidateAnswer> Answers { get; set; }

        public CandidateExamAssignment()
        {
            Status = "pending";
            Answers = new List<CandidateAnswer>();
        }
    }
}
