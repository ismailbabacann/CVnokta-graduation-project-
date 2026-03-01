using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Applications.Commands.UpdateApplicationStage
{
    // Allows HR to move an application to the next stage (e.g.: Interview).
    public class UpdateApplicationStageCommand : IRequest<bool>
    {
        public Guid ApplicationId { get; set; }
        public string NewStage { get; set; }
        public string Notes { get; set; }
    }

    public class UpdateApplicationStageCommandHandler : IRequestHandler<UpdateApplicationStageCommand, bool>
    {
        private readonly IGenericRepositoryAsync<ApplicationStage> _stageRepository;
        private readonly IGenericRepositoryAsync<JobApplication> _applicationRepository;

        public UpdateApplicationStageCommandHandler(IGenericRepositoryAsync<ApplicationStage> stageRepository, IGenericRepositoryAsync<JobApplication> applicationRepository)
        {
            _stageRepository = stageRepository;
            _applicationRepository = applicationRepository;
        }

        public async Task<bool> Handle(UpdateApplicationStageCommand request, CancellationToken cancellationToken)
        {
            var app = await _applicationRepository.GetByIdAsync(request.ApplicationId);
            if(app == null) return false;

            // Create new stage history
            var stage = new ApplicationStage
            {
                ApplicationId = request.ApplicationId,
                JobPostingId = app.JobPostingId,
                StageType = request.NewStage,
                StageStatus = "In Progress",
                StartedAt = DateTime.UtcNow,
                Notes = request.Notes
            };
            await _stageRepository.AddAsync(stage);

            // Update application status
            app.ApplicationStatus = request.NewStage;
            await _applicationRepository.UpdateAsync(app);
            
            return true;
        }
    }
}
