using System;

namespace CleanArchitecture.Core.Entities
{
    /// <summary>
    /// Stores dual-perspective feedback (HR + Candidate) for each pipeline stage.
    /// Populated by AI-NLP service at scoring time.
    /// </summary>
    public class StageFeedback : AuditableBaseEntity
    {
        public Guid ApplicationId { get; set; }

        /// <summary>
        /// CV_ANALYSIS | ENGLISH_TEST | SKILLS_TEST | AI_INTERVIEW | FINAL_SUMMARY
        /// </summary>
        public string StageType { get; set; }

        // HR perspective (third-person: "Aday ...")
        public string HrStrengths { get; set; }    // JSON array of strings
        public string HrWeaknesses { get; set; }   // JSON array of strings
        public string HrOverall { get; set; }      // Overall feedback paragraph

        // Candidate perspective (second-person: "Siz ...")
        public string CandidateStrengths { get; set; }    // JSON array of strings
        public string CandidateWeaknesses { get; set; }   // JSON array of strings
        public string CandidateOverall { get; set; }      // Overall feedback paragraph

        // Navigation
        public virtual JobApplication JobApplication { get; set; }
    }
}
