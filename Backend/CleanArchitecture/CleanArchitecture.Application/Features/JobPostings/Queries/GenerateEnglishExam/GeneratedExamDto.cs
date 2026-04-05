using System.Collections.Generic;

namespace CleanArchitecture.Application.Features.JobPostings.Queries.GenerateEnglishExam
{
    public class GeneratedExamDto
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public List<GeneratedExamQuestionDto> Questions { get; set; } = new List<GeneratedExamQuestionDto>();
    }

    public class GeneratedExamQuestionDto
    {
        public string QuestionText { get; set; }
        public List<string> Options { get; set; } = new List<string>();
        
        /// <summary>Should exactly match one of the items in Options array.</summary>
        public string CorrectAnswer { get; set; }
    }
}
