using System;

namespace CleanArchitecture.Core.Entities
{
    /// <summary>
    /// Stores a candidate's answer to a single question within an exam assignment.
    /// </summary>
    public class CandidateAnswer : AuditableBaseEntity
    {
        public Guid AssignmentId { get; set; }          // FK → CandidateExamAssignment
        public Guid QuestionId { get; set; }            // FK → Question

        public string AnswerText { get; set; }

        /// <summary>Auto-evaluated for MC/TF; NULL for open_ended until manually graded</summary>
        public bool? IsCorrect { get; set; }

        /// <summary>Points earned for this answer; NULL until graded</summary>
        public int? PointsEarned { get; set; }

        /// <summary>HR feedback for manual grading</summary>
        public string GradingFeedback { get; set; }

        public DateTime? AnsweredAt { get; set; }

        // ── Navigation ──────────────────────────────────────────
        public virtual CandidateExamAssignment Assignment { get; set; }
        public virtual Question Question { get; set; }
    }
}
