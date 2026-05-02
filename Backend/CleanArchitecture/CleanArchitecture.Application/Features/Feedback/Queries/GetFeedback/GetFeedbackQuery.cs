using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Feedback.Queries.GetFeedback
{
    // ── DTOs ──

    public class FeedbackContentDto
    {
        public List<string> Strengths { get; set; } = new();
        public List<string> Weaknesses { get; set; } = new();
        public string Overall { get; set; } = "";
    }

    public class StageFeedbackDto
    {
        public string StageType { get; set; }
        public FeedbackContentDto HrFeedback { get; set; } = new();
        public FeedbackContentDto CandidateFeedback { get; set; } = new();
    }

    public class ApplicationFeedbackResponse
    {
        public Guid ApplicationId { get; set; }
        public List<StageFeedbackDto> Feedbacks { get; set; } = new();
    }

    // ── Query ──

    public class GetFeedbackQuery : IRequest<ApplicationFeedbackResponse>
    {
        public Guid ApplicationId { get; set; }
        /// <summary>
        /// Optional: "hr" or "candidate" to filter perspective. Null returns both.
        /// </summary>
        public string Perspective { get; set; }
    }

    public class GetFeedbackQueryHandler : IRequestHandler<GetFeedbackQuery, ApplicationFeedbackResponse>
    {
        private readonly IGenericRepositoryAsync<StageFeedback> _feedbackRepository;

        public GetFeedbackQueryHandler(IGenericRepositoryAsync<StageFeedback> feedbackRepository)
        {
            _feedbackRepository = feedbackRepository;
        }

        public async Task<ApplicationFeedbackResponse> Handle(GetFeedbackQuery request, CancellationToken cancellationToken)
        {
            var allFeedbacks = await _feedbackRepository.GetAllAsync();
            var feedbacks = allFeedbacks
                .Where(f => f.ApplicationId == request.ApplicationId)
                .OrderBy(f => GetStageOrder(f.StageType))
                .ToList();

            var response = new ApplicationFeedbackResponse
            {
                ApplicationId = request.ApplicationId,
                Feedbacks = feedbacks.Select(f => ToDto(f, request.Perspective)).ToList()
            };

            return response;
        }

        private static StageFeedbackDto ToDto(StageFeedback entity, string perspective)
        {
            var dto = new StageFeedbackDto { StageType = entity.StageType };

            if (string.IsNullOrEmpty(perspective) || perspective.Equals("hr", StringComparison.OrdinalIgnoreCase))
            {
                dto.HrFeedback = new FeedbackContentDto
                {
                    Strengths = DeserializeList(entity.HrStrengths),
                    Weaknesses = DeserializeList(entity.HrWeaknesses),
                    Overall = entity.HrOverall ?? ""
                };
            }

            if (string.IsNullOrEmpty(perspective) || perspective.Equals("candidate", StringComparison.OrdinalIgnoreCase))
            {
                dto.CandidateFeedback = new FeedbackContentDto
                {
                    Strengths = DeserializeList(entity.CandidateStrengths),
                    Weaknesses = DeserializeList(entity.CandidateWeaknesses),
                    Overall = entity.CandidateOverall ?? ""
                };
            }

            return dto;
        }

        private static List<string> DeserializeList(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
                return new List<string>();
            try
            {
                return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
            }
            catch
            {
                return new List<string> { json };
            }
        }

        private static int GetStageOrder(string stageType)
        {
            return stageType switch
            {
                "CV_ANALYSIS" => 1,
                "ENGLISH_TEST" => 2,
                "SKILLS_TEST" => 3,
                "AI_INTERVIEW" => 4,
                "FINAL_SUMMARY" => 5,
                _ => 99
            };
        }
    }
}
