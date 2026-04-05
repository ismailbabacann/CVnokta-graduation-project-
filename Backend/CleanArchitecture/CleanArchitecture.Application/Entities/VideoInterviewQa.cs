using System;

namespace CleanArchitecture.Core.Entities
{
    public class VideoInterviewQa : AuditableBaseEntity
    {
        public Guid VideoInterviewId { get; set; }
        public virtual VideoInterview VideoInterview { get; set; }

        public string QuestionText { get; set; }
        public string AnswerText { get; set; }
        public string VideoUrl { get; set; }
    }
}
