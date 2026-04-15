using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Interviews.Commands.CompleteAiInterview
{
    // Finalizes the AI interview and triggers automatic pipeline advancement.
    public class CompleteAiInterviewCommand : IRequest<bool>
    {
        public Guid SessionId { get; set; }
        /// <summary>Overall interview score (0-100). Required for pipeline evaluation.</summary>
        public decimal? OverallScore { get; set; }
    }

    public class CompleteAiInterviewCommandHandler : IRequestHandler<CompleteAiInterviewCommand, bool>
    {
        private readonly IGenericRepositoryAsync<AiInterviewSession> _repository;
        private readonly IGenericRepositoryAsync<AiInterviewSummary> _summaryRepository;
        private readonly IPipelineService _pipelineService;

        public CompleteAiInterviewCommandHandler(
            IGenericRepositoryAsync<AiInterviewSession> repository,
            IGenericRepositoryAsync<AiInterviewSummary> summaryRepository,
            IPipelineService pipelineService)
        {
            _repository = repository;
            _summaryRepository = summaryRepository;
            _pipelineService = pipelineService;
        }

        public async Task<bool> Handle(CompleteAiInterviewCommand request, CancellationToken cancellationToken)
        {
            var session = await _repository.GetByIdAsync(request.SessionId);
            if (session == null) return false;

            session.SessionStatus = "Completed";
            session.CompletedAt = DateTime.UtcNow;
            await _repository.UpdateAsync(session);

            // Get score from summary if not provided directly
            decimal score = request.OverallScore ?? 0m;
            if (score == 0m)
            {
                var summaries = await _summaryRepository.GetAllAsync();
                var summary = summaries.FirstOrDefault(s => s.SessionId == request.SessionId);
                score = summary?.OverallInterviewScore ?? 0m;
            }

            // ── Pipeline: automatically advance or complete based on AI interview score ──
            try
            {
                await _pipelineService.AdvanceIfEligibleAsync(session.ApplicationId, "AI_INTERVIEW", score);
            }
            catch { /* pipeline failures must not block interview completion */ }

            return true;
        }
    }
}
