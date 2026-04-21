using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CleanArchitecture.Application.Features.JobPostings.Queries.GenerateJobPostingDetails;
using CleanArchitecture.Application.Features.JobPostings.Queries.GenerateEnglishExam;
using CleanArchitecture.Core.Features.Exams.Commands.SubmitExam;

namespace CleanArchitecture.Application.Interfaces
{
    public interface IAiJobPostingGenerationService
    {
        Task<GeneratedJobPostingDto> GenerateJobPostingAsync(string applicationContext);
        Task<GeneratedExamDto> GenerateEnglishExamAsync(string testContext);
        Task<string> GetExamFeedbackAsync(Guid applicationId, string jobTitle, int totalQuestions, int correctAnswers, decimal score, bool passed, List<CleanArchitecture.Core.Features.Exams.Commands.SubmitExam.QuestionResultDto> results);
        Task AnalyzeCvAsync(Guid applicationId, string cvFilePath, CleanArchitecture.Core.Entities.JobPosting jobPosting, Guid stageId, Guid cvId);
    }
}
