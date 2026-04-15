using System;

namespace CleanArchitecture.Core.Entities
{
    /// <summary>
    /// A single question within an Exam.
    /// Supports multiple_choice, true_false, and open_ended types.
    /// </summary>
    public class Question : AuditableBaseEntity
    {
        public Guid ExamId { get; set; }

        public string QuestionText { get; set; }

        /// <summary>multiple_choice | true_false | open_ended</summary>
        public string QuestionType { get; set; }

        /// <summary>
        /// JSON array of answer options for multiple_choice / true_false.
        /// Format: [{"key":"A","text":"..."}, {"key":"B","text":"..."}]
        /// NULL for open_ended questions.
        /// </summary>
        public string OptionsJson { get; set; }

        /// <summary>Correct answer key (e.g. "A", "True"). NULL for open_ended.</summary>
        public string CorrectAnswer { get; set; }

        /// <summary>Points awarded for a correct answer. Default: 10</summary>
        public int Points { get; set; }

        /// <summary>Display order within the exam</summary>
        public int OrderIndex { get; set; }

        // ── Navigation ──────────────────────────────────────────
        public virtual Exam Exam { get; set; }

        public Question()
        {
            Points = 10;
        }
    }
}
