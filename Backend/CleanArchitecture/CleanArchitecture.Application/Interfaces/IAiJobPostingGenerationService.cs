using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CleanArchitecture.Application.Features.JobPostings.Queries.GenerateJobPostingDetails;
using CleanArchitecture.Application.Features.JobPostings.Queries.GenerateEnglishExam;
using CleanArchitecture.Core.Features.Exams.Commands.SubmitExam;

namespace CleanArchitecture.Application.Interfaces
{
    public class ExamFeedbackResult
    {
        public string Feedback { get; set; }
        public string Strengths { get; set; }
        public string Weaknesses { get; set; }
    }

    /// <summary>
    /// Result of AI-powered job stats extraction (called when a job posting is published).
    /// </summary>
    public class JobStatsExtractionResult
    {
        public List<string> Skills { get; set; } = new List<string>();
        public List<string> Positions { get; set; } = new List<string>();
        public List<string> Locations { get; set; } = new List<string>();
    }

    public interface IAiJobPostingGenerationService
    {
        Task<GeneratedJobPostingDto> GenerateJobPostingAsync(string applicationContext);
        Task<GeneratedExamDto> GenerateEnglishExamAsync(string testContext);
        Task<ExamFeedbackResult> GetExamFeedbackAsync(Guid applicationId, string jobTitle, int totalQuestions, int correctAnswers, decimal score, bool passed, List<CleanArchitecture.Core.Features.Exams.Commands.SubmitExam.QuestionResultDto> results);
        Task AnalyzeCvAsync(Guid applicationId, string cvFilePath, CleanArchitecture.Core.Entities.JobPosting jobPosting, Guid stageId, Guid cvId);

        /// <summary>
        /// Extracts skills, positions and locations from a published job posting
        /// and returns them for upsert into Market*Stat tables.
        /// Uses LLM when available; falls back to simple text parsing.
        /// </summary>
        Task<JobStatsExtractionResult> ExtractJobStatsAsync(string jobTitle, string requiredSkills, string location, string responsibilities = null, string requiredQualifications = null);
    }
}

