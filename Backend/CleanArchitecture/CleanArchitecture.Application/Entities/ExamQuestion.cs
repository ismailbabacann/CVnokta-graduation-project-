using System;

namespace CleanArchitecture.Core.Entities
{
    public class ExamQuestion : AuditableBaseEntity
    {
        public Guid JobPostingExamId { get; set; }
        public virtual JobPostingExam JobPostingExam { get; set; }

        public string QuestionText { get; set; }
        public string CorrectAnswer { get; set; }

        /// <summary>
        /// JSON array string list of options e.g. ["A", "B", "C"]
        /// </summary>
        public string OptionsJson { get; set; }
    }
}
