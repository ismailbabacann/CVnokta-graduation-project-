using System.Threading.Tasks;
using CleanArchitecture.Application.Features.JobPostings.Queries.GenerateJobPostingDetails;
using CleanArchitecture.Application.Features.JobPostings.Queries.GenerateEnglishExam;

namespace CleanArchitecture.Application.Interfaces
{
    public interface IAiJobPostingGenerationService
    {
        Task<GeneratedJobPostingDto> GenerateJobPostingAsync(string applicationContext);
        Task<GeneratedExamDto> GenerateEnglishExamAsync(string testContext);
    }
}
