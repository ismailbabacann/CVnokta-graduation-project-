using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Interviews.Queries.GetAiInterviewSummary
{
    // Tamamlanan mülakatın AI tarafından çıkarılan özetini ve puanlarını getirir.
    public class GetAiInterviewSummaryQuery : IRequest<AiInterviewSummary>
    {
        public Guid SessionId { get; set; }
    }

    public class GetAiInterviewSummaryQueryHandler : IRequestHandler<GetAiInterviewSummaryQuery, AiInterviewSummary>
    {
         private readonly IGenericRepositoryAsync<AiInterviewSummary> _repository;

        public GetAiInterviewSummaryQueryHandler(IGenericRepositoryAsync<AiInterviewSummary> repository)
        {
            _repository = repository;
        }

        public async Task<AiInterviewSummary> Handle(GetAiInterviewSummaryQuery request, CancellationToken cancellationToken)
        {
            // Using linear search as temporary measure for generic repo limitation
            var all = await _repository.GetAllAsync();
            foreach(var s in all)
            {
                if(s.SessionId == request.SessionId) return s;
            }
            return null;
        }
    }
}
