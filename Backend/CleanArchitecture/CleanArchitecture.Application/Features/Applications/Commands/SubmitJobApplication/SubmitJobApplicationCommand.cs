using AutoMapper;
using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Application.Interfaces;
using MediatR;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Applications.Commands.SubmitJobApplication
{
    // Allows a candidate to apply for a job posting.
    public class SubmitJobApplicationCommand : IRequest<Guid>
    {
        public Guid JobPostingId { get; set; }
        public Guid CandidateId { get; set; }
        public Guid CvId { get; set; }
        public string CoverLetter { get; set; }
    }

    public class SubmitJobApplicationCommandHandler : IRequestHandler<SubmitJobApplicationCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<JobApplication> _repository;
        private readonly IGenericRepositoryAsync<JobPosting> _jobRepo;
        private readonly IGenericRepositoryAsync<CandidateProfile> _profileRepo;
        private readonly IGenericRepositoryAsync<ApplicationStage> _stageRepo;
        private readonly IAiJobPostingGenerationService _aiService;
        private readonly IMapper _mapper;

        public SubmitJobApplicationCommandHandler(
            IGenericRepositoryAsync<JobApplication> repository, 
            IGenericRepositoryAsync<JobPosting> jobRepo,
            IGenericRepositoryAsync<CandidateProfile> profileRepo,
            IGenericRepositoryAsync<ApplicationStage> stageRepo,
            IAiJobPostingGenerationService aiService,
            IMapper mapper)
        {
            _repository = repository;
            _jobRepo = jobRepo;
            _profileRepo = profileRepo;
            _stageRepo = stageRepo;
            _aiService = aiService;
            _mapper = mapper;
        }

        public async Task<Guid> Handle(SubmitJobApplicationCommand request, CancellationToken cancellationToken)
        {
            var application = _mapper.Map<JobApplication>(request);
            application.AppliedAt = DateTime.UtcNow;
            application.ApplicationStatus = "Received";
            
            await _repository.AddAsync(application);

            // --- Trigger AI CV Analysis if enabled ---
            try
            {
                var jobPosting = await _jobRepo.GetByIdAsync(request.JobPostingId);
                if (jobPosting != null && jobPosting.AiScanEnabled)
                {
                    var profiles = await _profileRepo.GetAllAsync();
                    var profile = profiles.FirstOrDefault(p => p.Id == request.CandidateId || p.UserId == request.CandidateId);
                    
                    if (profile != null && !string.IsNullOrWhiteSpace(profile.CvUrl))
                    {
                        // Create initial stage for Pipeline tracking
                        var stage = new ApplicationStage
                        {
                            ApplicationId = application.Id,
                            JobPostingId = jobPosting.Id,
                            StageType = "NLP_REVIEW",
                            StageStatus = "Pending",
                            StartedAt = DateTime.UtcNow
                        };
                        await _stageRepo.AddAsync(stage);

                        // Trigger analysis (fire-and-forget)
                        await _aiService.AnalyzeCvAsync(application.Id, profile.CvUrl, jobPosting, stage.Id, application.CvId ?? Guid.Empty);
                        
                        application.ApplicationStatus = "NLP_REVIEW_PENDING";
                        application.CurrentPipelineStage = "NLP_REVIEW";
                        await _repository.UpdateAsync(application);
                    }
                }
            }
            catch (Exception ex)
            {
                // Log error but don't fail the submission
                Console.WriteLine($"Failed to trigger CV analysis: {ex.Message}");
            }

            return application.Id;
        }
    }
}
