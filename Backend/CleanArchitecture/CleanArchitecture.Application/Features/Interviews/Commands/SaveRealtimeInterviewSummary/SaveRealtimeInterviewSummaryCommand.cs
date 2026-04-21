using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Interviews.Commands.SaveRealtimeInterviewSummary
{
    public class SaveRealtimeInterviewSummaryCommand : IRequest<Guid>
    {
        public Guid ApplicationId { get; set; }
        public Guid JobPostingId { get; set; }
        public string ExternalSessionId { get; set; }
        public decimal? OverallInterviewScore { get; set; }
        public decimal? CommunicationScore { get; set; }
        public decimal? TechnicalKnowledgeScore { get; set; }
        public decimal? JobMatchScore { get; set; }
        public decimal? ExperienceAlignmentScore { get; set; }
        public int? TotalQuestionsAsked { get; set; }
        public int? TotalQuestionsAnswered { get; set; }
        public string SummaryText { get; set; }
        public string Strengths { get; set; }
        public string Weaknesses { get; set; }
        public string Recommendations { get; set; }
        public bool? IsPassed { get; set; }
    }

    public class SaveRealtimeInterviewSummaryCommandHandler : IRequestHandler<SaveRealtimeInterviewSummaryCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<AiInterviewSummary> _summaryRepository;
        private readonly IPipelineService _pipelineService;

        public SaveRealtimeInterviewSummaryCommandHandler(
            IGenericRepositoryAsync<AiInterviewSummary> summaryRepository,
            IPipelineService pipelineService)
        {
            _summaryRepository = summaryRepository;
            _pipelineService = pipelineService;
        }

        public async Task<Guid> Handle(SaveRealtimeInterviewSummaryCommand request, CancellationToken cancellationToken)
        {
            Guid sessionId = Guid.TryParse(request.ExternalSessionId, out var parsedId) ? parsedId : Guid.Empty;

            var summary = new AiInterviewSummary
            {
                ApplicationId = request.ApplicationId,
                SessionId = sessionId,
                OverallInterviewScore = request.OverallInterviewScore,
                CommunicationScore = request.CommunicationScore,
                TechnicalKnowledgeScore = request.TechnicalKnowledgeScore,
                JobMatchScore = request.JobMatchScore,
                ExperienceAlignmentScore = request.ExperienceAlignmentScore,
                TotalQuestionsAsked = request.TotalQuestionsAsked,
                TotalQuestionsAnswered = request.TotalQuestionsAnswered,
                SummaryText = request.SummaryText,
                Strengths = request.Strengths,
                Weaknesses = request.Weaknesses,
                Recommendations = request.Recommendations,
                IsPassed = request.IsPassed
            };

            await _summaryRepository.AddAsync(summary);

            try
            {
                decimal score = request.OverallInterviewScore ?? 0m;
                await _pipelineService.AdvanceIfEligibleAsync(request.ApplicationId, "AI_INTERVIEW", score);
            }
            catch { /* Ignore */ }

            return summary.Id;
        }
    }
}
