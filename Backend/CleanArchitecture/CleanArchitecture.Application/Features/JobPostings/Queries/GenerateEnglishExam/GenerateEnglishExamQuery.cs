using CleanArchitecture.Application.Interfaces;
using MediatR;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Application.Features.JobPostings.Queries.GenerateEnglishExam
{
    public class GenerateEnglishExamQuery : IRequest<GeneratedExamDto>
    {
        public string TestContext { get; set; }
    }

    public class GenerateEnglishExamQueryHandler : IRequestHandler<GenerateEnglishExamQuery, GeneratedExamDto>
    {
        private readonly IAiJobPostingGenerationService _aiJobPostingGenerationService;

        public GenerateEnglishExamQueryHandler(IAiJobPostingGenerationService aiJobPostingGenerationService)
        {
            _aiJobPostingGenerationService = aiJobPostingGenerationService;
        }

        public async Task<GeneratedExamDto> Handle(GenerateEnglishExamQuery request, CancellationToken cancellationToken)
        {
            return await _aiJobPostingGenerationService.GenerateEnglishExamAsync(request.TestContext);
        }
    }
}
