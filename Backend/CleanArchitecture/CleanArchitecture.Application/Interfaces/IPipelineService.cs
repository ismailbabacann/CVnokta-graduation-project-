using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CleanArchitecture.Core.Features.Exams.Commands.SubmitExam;

namespace CleanArchitecture.Core.Interfaces
{
    /// <summary>
    /// Automated recruitment pipeline service.
    /// Called after every stage result is saved to advance/reject the candidate automatically.
    /// </summary>
    public interface IPipelineService
    {
        /// <summary>
        /// Evaluate the application's score for the just-completed stage and advance or reject automatically.
        /// </summary>
        /// <param name="applicationId">The application being evaluated.</param>
        /// <param name="completedStage">Stage that just finished: NLP_REVIEW | SKILLS_TEST | ENGLISH_TEST | AI_INTERVIEW</param>
        /// <param name="score">Score achieved (0-100).</param>
        /// <param name="results">Optional detailed exam results for AI feedback.</param>
        Task AdvanceIfEligibleAsync(Guid applicationId, string completedStage, decimal score, List<QuestionResultDto> results = null, string cvFeedback = null);
    }
}
