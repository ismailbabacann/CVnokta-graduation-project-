using CleanArchitecture.Core.DTOs.Email;
using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Helpers;
using CleanArchitecture.Core.Interfaces;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace CleanArchitecture.Infrastructure.Services
{
    /// <summary>
    /// Automated recruitment pipeline engine.
    /// Called after each stage score is saved — advances or rejects the candidate automatically.
    /// HR never needs to manually trigger stage transitions.
    /// </summary>
    public class PipelineService : IPipelineService
    {
        private readonly IGenericRepositoryAsync<JobApplication> _applicationRepo;
        private readonly IGenericRepositoryAsync<JobPosting> _jobPostingRepo;
        private readonly IGenericRepositoryAsync<CandidateProfile> _profileRepo;
        private readonly IEmailService _emailService;

        public PipelineService(
            IGenericRepositoryAsync<JobApplication> applicationRepo,
            IGenericRepositoryAsync<JobPosting> jobPostingRepo,
            IGenericRepositoryAsync<CandidateProfile> profileRepo,
            IEmailService emailService)
        {
            _applicationRepo = applicationRepo;
            _jobPostingRepo  = jobPostingRepo;
            _profileRepo     = profileRepo;
            _emailService    = emailService;
        }

        public async Task AdvanceIfEligibleAsync(Guid applicationId, string completedStage, decimal score)
        {
            var application = await _applicationRepo.GetByIdAsync(applicationId);
            if (application == null) return;

            var jobPosting = await _jobPostingRepo.GetByIdAsync(application.JobPostingId);
            if (jobPosting == null) return;

            int threshold = jobPosting.PipelinePassThreshold > 0 ? jobPosting.PipelinePassThreshold : 70;

            // Get candidate info for emails
            var profiles = await _profileRepo.GetAllAsync();
            var profile = profiles.FirstOrDefault(p => p.Id == application.CandidateId);
            string candidateName  = profile?.FullName ?? "Candidate";
            string candidateEmail = profile?.Email ?? "";
            string jobTitle       = jobPosting.JobTitle ?? "Position";

            bool passed = score >= threshold;

            switch (completedStage.ToUpper())
            {
                case "NLP_REVIEW":
                    if (passed)
                    {
                        application.CurrentPipelineStage  = "SKILLS_TEST_PENDING";
                        application.ApplicationStatus     = "SKILLS_TEST_PENDING";
                        application.PipelineStageUpdatedAt = DateTime.UtcNow;
                        await _applicationRepo.UpdateAsync(application);
                        await SendEmailSafe(candidateEmail, 
                            $"Beceri Testi Daveti — {jobTitle} | CVNokta",
                            EmailTemplateService.GetSkillsTestInviteTemplate(candidateName, jobTitle, threshold));
                    }
                    else
                    {
                        application.CurrentPipelineStage  = "REJECTED_NLP";
                        application.ApplicationStatus     = "REJECTED";
                        application.RejectionReason       = $"CV analiz skorunuz ({score:0}), bu ilan için gerekli minimum eşiğin ({threshold}) altında kalmıştır.";
                        application.PipelineStageUpdatedAt = DateTime.UtcNow;
                        await _applicationRepo.UpdateAsync(application);
                        await SendEmailSafe(candidateEmail,
                            $"Başvurunuz Hakkında — {jobTitle} | CVNokta",
                            EmailTemplateService.GetPipelineRejectionTemplate(candidateName, jobTitle, "CV Analizi", (int)score, threshold));
                    }
                    break;

                case "SKILLS_TEST":
                    if (passed)
                    {
                        application.CurrentPipelineStage  = "ENGLISH_TEST_PENDING";
                        application.ApplicationStatus     = "ENGLISH_TEST_PENDING";
                        application.PipelineStageUpdatedAt = DateTime.UtcNow;
                        await _applicationRepo.UpdateAsync(application);
                        await SendEmailSafe(candidateEmail,
                            $"İngilizce Testi Daveti — {jobTitle} | CVNokta",
                            EmailTemplateService.GetEnglishTestInviteTemplate(candidateName, jobTitle, threshold));
                    }
                    else
                    {
                        application.CurrentPipelineStage  = "REJECTED_SKILLS";
                        application.ApplicationStatus     = "REJECTED";
                        application.RejectionReason       = $"Genel beceri testi skorunuz ({score:0}), gerekli minimum eşiğin ({threshold}) altında kalmıştır.";
                        application.PipelineStageUpdatedAt = DateTime.UtcNow;
                        await _applicationRepo.UpdateAsync(application);
                        await SendEmailSafe(candidateEmail,
                            $"Başvurunuz Hakkında — {jobTitle} | CVNokta",
                            EmailTemplateService.GetPipelineRejectionTemplate(candidateName, jobTitle, "Genel Beceri Testi", (int)score, threshold));
                    }
                    break;

                case "ENGLISH_TEST":
                    if (passed)
                    {
                        application.CurrentPipelineStage  = "AI_INTERVIEW_PENDING";
                        application.ApplicationStatus     = "AI_INTERVIEW_PENDING";
                        application.PipelineStageUpdatedAt = DateTime.UtcNow;
                        await _applicationRepo.UpdateAsync(application);
                        await SendEmailSafe(candidateEmail,
                            $"AI Mülakat Daveti — {jobTitle} | CVNokta",
                            EmailTemplateService.GetAiInterviewInviteTemplate(candidateName, jobTitle, threshold));
                    }
                    else
                    {
                        application.CurrentPipelineStage  = "REJECTED_ENGLISH";
                        application.ApplicationStatus     = "REJECTED";
                        application.RejectionReason       = $"İngilizce testi skorunuz ({score:0}), gerekli minimum eşiğin ({threshold}) altında kalmıştır.";
                        application.PipelineStageUpdatedAt = DateTime.UtcNow;
                        await _applicationRepo.UpdateAsync(application);
                        await SendEmailSafe(candidateEmail,
                            $"Başvurunuz Hakkında — {jobTitle} | CVNokta",
                            EmailTemplateService.GetPipelineRejectionTemplate(candidateName, jobTitle, "İngilizce Testi", (int)score, threshold));
                    }
                    break;

                case "AI_INTERVIEW":
                    if (passed)
                    {
                        application.CurrentPipelineStage  = "COMPLETED";
                        application.ApplicationStatus     = "COMPLETED";
                        application.PipelineStageUpdatedAt = DateTime.UtcNow;
                        await _applicationRepo.UpdateAsync(application);
                        await SendEmailSafe(candidateEmail,
                            $"Tebrikler! Süreç Tamamlandı — {jobTitle} | CVNokta",
                            EmailTemplateService.GetPipelineCompletedTemplate(candidateName, jobTitle));
                    }
                    else
                    {
                        application.CurrentPipelineStage  = "REJECTED_AI";
                        application.ApplicationStatus     = "REJECTED";
                        application.RejectionReason       = $"AI mülakat skorunuz ({score:0}), gerekli minimum eşiğin ({threshold}) altında kalmıştır.";
                        application.PipelineStageUpdatedAt = DateTime.UtcNow;
                        await _applicationRepo.UpdateAsync(application);
                        await SendEmailSafe(candidateEmail,
                            $"Başvurunuz Hakkında — {jobTitle} | CVNokta",
                            EmailTemplateService.GetPipelineRejectionTemplate(candidateName, jobTitle, "AI Mülakat", (int)score, threshold));
                    }
                    break;
            }
        }

        private async Task SendEmailSafe(string to, string subject, string html)
        {
            if (string.IsNullOrWhiteSpace(to)) return;
            try
            {
                await _emailService.SendAsync(new EmailRequest { To = to, Subject = subject, Body = html });
            }
            catch { /* Email failures must not block pipeline */ }
        }
    }
}
