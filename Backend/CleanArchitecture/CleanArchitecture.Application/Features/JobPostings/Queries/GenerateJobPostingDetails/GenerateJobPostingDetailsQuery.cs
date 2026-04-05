using CleanArchitecture.Application.Interfaces;
using MediatR;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Application.Features.JobPostings.Queries.GenerateJobPostingDetails
{
    public class GenerateJobPostingDetailsQuery : IRequest<GeneratedJobPostingDto>
    {
        public string ApplicationContext { get; set; }
    }

    public class GenerateJobPostingDetailsQueryHandler : IRequestHandler<GenerateJobPostingDetailsQuery, GeneratedJobPostingDto>
    {
        private readonly IAiJobPostingGenerationService _aiJobPostingGenerationService;

        public GenerateJobPostingDetailsQueryHandler(IAiJobPostingGenerationService aiJobPostingGenerationService)
        {
            _aiJobPostingGenerationService = aiJobPostingGenerationService;
        }

        public async Task<GeneratedJobPostingDto> Handle(GenerateJobPostingDetailsQuery request, CancellationToken cancellationToken)
        {
            return await _aiJobPostingGenerationService.GenerateJobPostingAsync(request.ApplicationContext);
        }
    }
}
