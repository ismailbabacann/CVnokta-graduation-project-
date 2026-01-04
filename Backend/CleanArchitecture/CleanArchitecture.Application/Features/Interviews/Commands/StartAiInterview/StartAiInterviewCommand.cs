using AutoMapper;
using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Interviews.Commands.StartAiInterview
{
    // Adayın AI mülakat oturumunu başlatmasını sağlar.
    public class StartAiInterviewCommand : IRequest<Guid>
    {
        public Guid ApplicationId { get; set; }
        public Guid JobPostingId { get; set; }
    }

    public class StartAiInterviewCommandHandler : IRequestHandler<StartAiInterviewCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<AiInterviewSession> _repository;
        private readonly IGenericRepositoryAsync<JobApplication> _applicationRepository;
        private readonly IGenericRepositoryAsync<ApplicationStage> _stageRepository;
        private readonly IMapper _mapper;

        public StartAiInterviewCommandHandler(
            IGenericRepositoryAsync<AiInterviewSession> repository, 
            IGenericRepositoryAsync<JobApplication> applicationRepository,
            IGenericRepositoryAsync<ApplicationStage> stageRepository,
            IMapper mapper)
        {
            _repository = repository;
            _applicationRepository = applicationRepository;
            _stageRepository = stageRepository;
            _mapper = mapper;
        }

        public async Task<Guid> Handle(StartAiInterviewCommand request, CancellationToken cancellationToken)
        {
            var session = _mapper.Map<AiInterviewSession>(request);
            if(session == null) session = new AiInterviewSession();
            
            session.ApplicationId = request.ApplicationId;
            session.JobPostingId = request.JobPostingId;
            session.StartedAt = DateTime.UtcNow;
            session.SessionStatus = "Started";

            // IDs fetched from related entities
            var application = await _applicationRepository.GetByIdAsync(request.ApplicationId);
            session.CvId = application?.CvId ?? throw new Exception("Application not found or CV missing");

            // Assuming we take the latest stage for this application
            var stages = await _stageRepository.GetAllAsync(); // Linear search warning
            var currentStage = ((List<ApplicationStage>)stages).FindLast(s => s.ApplicationId == request.ApplicationId);
            session.StageId = currentStage?.Id ?? throw new Exception("No active stage found for application");

            await _repository.AddAsync(session);
            return session.Id;
        }
    }
}
