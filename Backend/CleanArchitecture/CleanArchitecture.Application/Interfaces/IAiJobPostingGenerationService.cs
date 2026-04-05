using System.Threading.Tasks;
using CleanArchitecture.Application.Features.JobPostings.Queries.GenerateJobPostingDetails;

namespace CleanArchitecture.Application.Interfaces
{
    public interface IAiJobPostingGenerationService
    {
        Task<GeneratedJobPostingDto> GenerateJobPostingAsync(string applicationContext);
    }
}
