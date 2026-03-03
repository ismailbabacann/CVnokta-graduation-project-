using System;

namespace CleanArchitecture.Core.Entities
{
    public class AiInterviewQa : AuditableBaseEntity
    {
        public Guid SessionId { get; set; }
        public int QuestionSequence { get; set; }
        public string QuestionCategory { get; set; }
        public string QuestionText { get; set; }
        public string CandidateAnswerText { get; set; }
        public string CandidateAnswerAudioPath { get; set; }
        public decimal? AiEvaluationScore { get; set; }
        public string AiEvaluationNotes { get; set; }
        public DateTime? AskedAt { get; set; }
        public DateTime? AnsweredAt { get; set; }
        public virtual AiInterviewSession Session { get; set; }
    }
}
