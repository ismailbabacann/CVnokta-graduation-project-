using System;

namespace CleanArchitecture.Core.Entities
{
    public class GeneralTestResult : AuditableBaseEntity
    {
        public Guid ApplicationId { get; set; }
        public Guid StageId { get; set; }
        public string TestName { get; set; }
        public int? TotalQuestions { get; set; }
        public int? CorrectAnswers { get; set; }
        public int? WrongAnswers { get; set; }
        public decimal? Score { get; set; }
        public int? DurationSeconds { get; set; }
        public bool? Passed { get; set; }
        public DateTime TestDate { get; set; }
        public virtual JobApplication JobApplication { get; set; }
        public virtual ApplicationStage Stage { get; set; }
    }
}
