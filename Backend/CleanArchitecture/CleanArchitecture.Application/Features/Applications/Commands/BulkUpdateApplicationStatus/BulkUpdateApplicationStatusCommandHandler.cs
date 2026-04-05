using CleanArchitecture.Core.DTOs.Email;
using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Core.Helpers;
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
        private readonly IGenericRepositoryAsync<CandidateProfile> _candidateRepository;
        private readonly IGenericRepositoryAsync<JobPosting> _jobPostingRepository;
        private readonly IEmailService _emailService;

        public BulkUpdateApplicationStatusCommandHandler(
            IGenericRepositoryAsync<JobApplication> applicationRepository,
            IGenericRepositoryAsync<ApplicationStage> stageRepository,
            IGenericRepositoryAsync<CandidateProfile> candidateRepository,
            IGenericRepositoryAsync<JobPosting> jobPostingRepository,
            IEmailService emailService)
        {
            _applicationRepository = applicationRepository;
            _stageRepository = stageRepository;
            _candidateRepository = candidateRepository;
            _jobPostingRepository = jobPostingRepository;
            _emailService = emailService;
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

                            if (request.NewStatus.Equals("Rejected", StringComparison.OrdinalIgnoreCase))
                            {
                                emailHtml = EmailTemplateService.GetApplicationRejectedTemplate(candidateName, jobTitle);
                                subject = $"Application Update — {jobTitle} | CVNokta";
                            }
                            else
                            {
                                emailHtml = EmailTemplateService.GetApplicationAcceptedTemplate(candidateName, jobTitle, request.NewStatus);
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
                        // Email failure should not block the bulk update
                    }
                }
            }

            return true;
        }
    }
}

