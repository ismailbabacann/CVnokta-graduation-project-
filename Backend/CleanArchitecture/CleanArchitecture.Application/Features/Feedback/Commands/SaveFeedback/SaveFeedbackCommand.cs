using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Feedback.Commands.SaveFeedback
{
    public class SaveFeedbackCommand : IRequest<bool>
    {
        public Guid ApplicationId { get; set; }
        public string StageType { get; set; }
        public List<string> HrStrengths { get; set; } = new();
        public List<string> HrWeaknesses { get; set; } = new();
        public string HrOverall { get; set; }
        public List<string> CandidateStrengths { get; set; } = new();
        public List<string> CandidateWeaknesses { get; set; } = new();
        public string CandidateOverall { get; set; }
    }

    public class SaveFeedbackCommandHandler : IRequestHandler<SaveFeedbackCommand, bool>
    {
        private readonly IGenericRepositoryAsync<StageFeedback> _feedbackRepository;
        private readonly IGenericRepositoryAsync<JobApplication> _applicationRepository;

        public SaveFeedbackCommandHandler(
            IGenericRepositoryAsync<StageFeedback> feedbackRepository,
            IGenericRepositoryAsync<JobApplication> applicationRepository)
        {
            _feedbackRepository = feedbackRepository;
            _applicationRepository = applicationRepository;
        }

        public async Task<bool> Handle(SaveFeedbackCommand request, CancellationToken cancellationToken)
        {
            var application = await _applicationRepository.GetByIdAsync(request.ApplicationId);
            if (application == null)
                return false;

            // Check if feedback already exists for this stage
            var allFeedbacks = await _feedbackRepository.GetAllAsync();
            var existing = allFeedbacks.FirstOrDefault(f =>
                f.ApplicationId == request.ApplicationId &&
                f.StageType == request.StageType);

            var hrStrengthsJson = JsonSerializer.Serialize(request.HrStrengths ?? new List<string>());
            var hrWeaknessesJson = JsonSerializer.Serialize(request.HrWeaknesses ?? new List<string>());
            var candidateStrengthsJson = JsonSerializer.Serialize(request.CandidateStrengths ?? new List<string>());
            var candidateWeaknessesJson = JsonSerializer.Serialize(request.CandidateWeaknesses ?? new List<string>());

            if (existing != null)
            {
                // Update existing feedback
                existing.HrStrengths = hrStrengthsJson;
                existing.HrWeaknesses = hrWeaknessesJson;
                existing.HrOverall = request.HrOverall ?? "";
                existing.CandidateStrengths = candidateStrengthsJson;
                existing.CandidateWeaknesses = candidateWeaknessesJson;
                existing.CandidateOverall = request.CandidateOverall ?? "";
                await _feedbackRepository.UpdateAsync(existing);
            }
            else
            {
                // Create new feedback
                var feedback = new StageFeedback
                {
                    ApplicationId = request.ApplicationId,
                    StageType = request.StageType,
                    HrStrengths = hrStrengthsJson,
                    HrWeaknesses = hrWeaknessesJson,
                    HrOverall = request.HrOverall ?? "",
                    CandidateStrengths = candidateStrengthsJson,
                    CandidateWeaknesses = candidateWeaknessesJson,
                    CandidateOverall = request.CandidateOverall ?? "",
                };
                await _feedbackRepository.AddAsync(feedback);
            }

            return true;
        }
    }
}
