using System;
using System.Collections.Generic;

namespace CleanArchitecture.Core.Entities
{
    /// <summary>
    /// Job posting entity. Covers all fields from the "Create New Job Posting" page.
    /// </summary>
    public class JobPosting : AuditableBaseEntity
    {
        // --- Basic Information ---
        public string JobTitle { get; set; }
        public string Department { get; set; }
        public string Location { get; set; }

        /// <summary>FullTime / PartTime / Contract / Internship</summary>
        public string WorkType { get; set; }

        /// <summary>Remote / Hybrid / OnSite</summary>
        public string WorkModel { get; set; }

        // --- Job Details ---
        /// <summary>Company introduction / About Us text</summary>
        public string AboutCompany { get; set; }

        /// <summary>About Role text (Rol Hakkında)</summary>
        public string AboutRole { get; set; }

        /// <summary>Responsibilities (rich text / HTML)</summary>
        public string Responsibilities { get; set; }

        /// <summary>Required Qualifications (rich text / HTML)</summary>
        public string RequiredQualifications { get; set; }

        /// <summary>Legacy general skills field (kept for backward compatibility)</summary>
        public string RequiredSkills { get; set; }

        public string LanguageLevel { get; set; }

        public decimal? SalaryMin { get; set; }
        public decimal? SalaryMax { get; set; }
        public int TotalPositions { get; set; }

        // --- AI Assistant Settings ---
        /// <summary>Is AI CV scanning enabled?</summary>
        public bool AiScanEnabled { get; set; }

        /// <summary>Minimum match score (0-100)</summary>
        public int MinMatchScore { get; set; }

        /// <summary>Should an automatic pre-interview invitation be sent to qualified candidates?</summary>
        public bool AutoEmailEnabled { get; set; }

        // --- Benefits (comma-separated list, e.g.: "Private Health Insurance,Meal Card") ---
        public string Benefits { get; set; }

        // --- Status and Dates ---
        /// <summary>Active | Draft | Closed</summary>
        public string Status { get; set; }

        public bool IsDraft { get; set; }
        public DateTime PostedDate { get; set; }
        public DateTime? ClosingDate { get; set; }

        // --- Relations ---
        public Guid HiringManagerId { get; set; }
        public virtual User HiringManager { get; set; }

        // --- Exam Settings ---
        public bool HasEnglishExam { get; set; }
        public virtual JobPostingExam EnglishExam { get; set; }

        // --- Pipeline Settings ---
        /// <summary>
        /// Minimum score (0-100) required to pass the CV Analysis (NLP) stage.
        /// Default: 60.
        /// </summary>
        public int PipelinePassThreshold { get; set; } = 60;  // kept as CV threshold (backward compat alias)

        /// <summary>CV analysis pass threshold (0-100). Default: 60.</summary>
        public int CvPassThreshold { get; set; } = 60;

        /// <summary>English test pass threshold (0-100). Default: 70.</summary>
        public int EnglishPassThreshold { get; set; } = 70;

        /// <summary>Technical (skills) test pass threshold (0-100). Default: 70.</summary>
        public int TechnicalPassThreshold { get; set; } = 70;

        /// <summary>AI Interview pass threshold (0-100). Default: 60.</summary>
        public int AiInterviewPassThreshold { get; set; } = 60;
    }
}
