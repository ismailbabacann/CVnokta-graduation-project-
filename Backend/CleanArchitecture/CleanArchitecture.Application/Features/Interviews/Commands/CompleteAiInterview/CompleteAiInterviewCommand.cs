using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Interviews.Commands.CompleteAiInterview
{
    // Mülakatı sonlandırır ve AI özet çıkarıcısını tetikler.
    public class CompleteAiInterviewCommand : IRequest<bool>
    {
        public Guid SessionId { get; set; }
    }

    public class CompleteAiInterviewCommandHandler : IRequestHandler<CompleteAiInterviewCommand, bool>
    {
        private readonly IGenericRepositoryAsync<AiInterviewSession> _repository;

        public CompleteAiInterviewCommandHandler(IGenericRepositoryAsync<AiInterviewSession> repository)
        {
            _repository = repository;
        }

        public async Task<bool> Handle(CompleteAiInterviewCommand request, CancellationToken cancellationToken)
        {
            var session = await _repository.GetByIdAsync(request.SessionId);
            if(session == null) return false;

            session.SessionStatus = "Completed";
            session.CompletedAt = DateTime.UtcNow;
            await _repository.UpdateAsync(session);

            // Trigger AI Summary Generation Event here (e.g., Domain Events or Job Queue)
            return true;
        }
    }
}
