using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Applications.Commands.BulkUpdateApplicationStatus
{
    public class BulkUpdateApplicationStatusCommandHandler : IRequestHandler<BulkUpdateApplicationStatusCommand, bool>
    {
        private readonly IGenericRepositoryAsync<JobApplication> _applicationRepository;
        private readonly IGenericRepositoryAsync<ApplicationStage> _stageRepository;

        public BulkUpdateApplicationStatusCommandHandler(
            IGenericRepositoryAsync<JobApplication> applicationRepository,
            IGenericRepositoryAsync<ApplicationStage> stageRepository)
        {
            _applicationRepository = applicationRepository;
            _stageRepository = stageRepository;
        }

        public async Task<bool> Handle(BulkUpdateApplicationStatusCommand request, CancellationToken cancellationToken)
        {
            if (request.ApplicationIds == null || request.ApplicationIds.Count == 0)
                return false;

            foreach (var id in request.ApplicationIds)
            {
                var app = await _applicationRepository.GetByIdAsync(id);
                if (app != null)
                {
                    app.ApplicationStatus = request.NewStatus;
                    await _applicationRepository.UpdateAsync(app);

                    var stage = new ApplicationStage
                    {
                        ApplicationId = app.Id,
                        JobPostingId = app.JobPostingId,
                        StageType = request.NewStatus,
                        StageStatus = "In Progress",
                        StartedAt = DateTime.UtcNow,
                        Notes = "Bulk Status Update"
                    };
                    await _stageRepository.AddAsync(stage);
                }
            }

            return true;
        }
    }
}
