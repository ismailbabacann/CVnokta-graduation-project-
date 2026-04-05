using CleanArchitecture.Core.DTOs.Email;
using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Core.Helpers;
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
        private readonly IGenericRepositoryAsync<CandidateProfile> _candidateRepository;
        private readonly IGenericRepositoryAsync<JobPosting> _jobPostingRepository;
        private readonly IEmailService _emailService;

        public UpdateApplicationStageCommandHandler(
            IGenericRepositoryAsync<ApplicationStage> stageRepository,
            IGenericRepositoryAsync<JobApplication> applicationRepository,
            IGenericRepositoryAsync<CandidateProfile> candidateRepository,
            IGenericRepositoryAsync<JobPosting> jobPostingRepository,
            IEmailService emailService)
        {
            _stageRepository = stageRepository;
            _applicationRepository = applicationRepository;
            _candidateRepository = candidateRepository;
            _jobPostingRepository = jobPostingRepository;
            _emailService = emailService;
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

            // Send status notification email to candidate
            try
            {
                var candidate = await _candidateRepository.GetByIdAsync(app.CandidateId);
                if (candidate != null && !string.IsNullOrWhiteSpace(candidate.Email))
                {
                    var jobPosting = await _jobPostingRepository.GetByIdAsync(app.JobPostingId);
                    var jobTitle = jobPosting?.JobTitle ?? "the position";
                    var candidateName = candidate.FullName ?? "Candidate";

                    string emailHtml;
                    string subject;

                    if (request.NewStage.Equals("Rejected", StringComparison.OrdinalIgnoreCase))
                    {
                        emailHtml = EmailTemplateService.GetApplicationRejectedTemplate(candidateName, jobTitle);
                        subject = $"Application Update — {jobTitle} | CVNokta";
                    }
                    else
                    {
                        emailHtml = EmailTemplateService.GetApplicationAcceptedTemplate(candidateName, jobTitle, request.NewStage);
                        subject = $"Great News! Your Application for {jobTitle} | CVNokta";
                    }

                    await _emailService.SendAsync(new EmailRequest
                    {
                        To = candidate.Email,
                        Subject = subject,
                        Body = emailHtml
                    });
                }
            }
            catch
            {
                // Email failure should not block the stage update
            }
            
            return true;
        }
    }
}

