using CleanArchitecture.Core.DTOs.Email;
using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Helpers;
using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Application.Interfaces;
using CleanArchitecture.Core.Features.Exams.Commands.SubmitExam;
using CleanArchitecture.Core.Settings;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CleanArchitecture.Core.Features.Exams.Services;

namespace CleanArchitecture.Infrastructure.Services
{
    /// <summary>
    /// Automated recruitment pipeline engine.
    /// Called after each stage score is saved — advances or rejects the candidate automatically.
    /// HR never needs to manually trigger stage transitions.
    /// </summary>
    public class PipelineService : IPipelineService
    {
        private readonly IGenericRepositoryAsync<JobApplication>           _applicationRepo;
        private readonly IGenericRepositoryAsync<JobPosting>               _jobRepo;
        private readonly IGenericRepositoryAsync<CandidateProfile>         _candidateRepo;
        private readonly IGenericRepositoryAsync<CandidateExamAssignment>  _assignmentRepo;
        private readonly JobExamSeedService                                _examSeedService;
        private readonly IExamTokenService                                 _tokenService;
        private readonly IAiJobPostingGenerationService                  _aiService;
        private readonly IEmailService                                     _emailService;
        private readonly ExamSettings                                      _examSettings;

        public PipelineService(
            IGenericRepositoryAsync<JobApplication>           applicationRepo,
            IGenericRepositoryAsync<JobPosting>               jobRepo,
            IGenericRepositoryAsync<CandidateProfile>         candidateRepo,
            IGenericRepositoryAsync<CandidateExamAssignment>  assignmentRepo,
            JobExamSeedService                                examSeedService,
            IExamTokenService                                 tokenService,
            IAiJobPostingGenerationService                  aiService,
            IEmailService                                     emailService,
            IOptions<ExamSettings>                            examSettings)
        {
            _applicationRepo = applicationRepo;
            _jobRepo         = jobRepo;
            _candidateRepo   = candidateRepo;
            _assignmentRepo  = assignmentRepo;
            _examSeedService = examSeedService;
            _tokenService    = tokenService;
            _aiService       = aiService;
            _emailService    = emailService;
            _examSettings    = examSettings.Value;
        }

        public async Task AdvanceIfEligibleAsync(Guid applicationId, string completedStage, decimal score, List<QuestionResultDto> results = null, string cvFeedback = null)
        {
            var application = await _applicationRepo.GetByIdAsync(applicationId);
            if (application == null) return;

            var jobPosting = await _jobRepo.GetByIdAsync(application.JobPostingId);
            if (jobPosting == null) return;

            // Per-stage thresholds with fallback to legacy PipelinePassThreshold
            int cvThreshold          = jobPosting.CvPassThreshold > 0          ? jobPosting.CvPassThreshold          : (jobPosting.PipelinePassThreshold > 0 ? jobPosting.PipelinePassThreshold : 60);
            int englishThreshold     = jobPosting.EnglishPassThreshold > 0      ? jobPosting.EnglishPassThreshold      : 70;
            int technicalThreshold   = jobPosting.TechnicalPassThreshold > 0    ? jobPosting.TechnicalPassThreshold    : 70;
            int aiInterviewThreshold = jobPosting.AiInterviewPassThreshold > 0  ? jobPosting.AiInterviewPassThreshold  : 60;

            // Get candidate info for emails
            var profile = await _candidateRepo.GetByIdAsync(application.CandidateId);
            string candidateName  = profile?.FullName ?? "Candidate";
            string candidateEmail = profile?.Email ?? "";
            string jobTitle       = jobPosting.JobTitle ?? "Position";

            Console.WriteLine($"[Pipeline] --- Processing Application: {applicationId} ---");
            Console.WriteLine($"[Pipeline] Stage Completed: {completedStage}");
            Console.WriteLine($"[Pipeline] Score: {score} | CV:{cvThreshold} EN:{englishThreshold} TECH:{technicalThreshold} AI:{aiInterviewThreshold}");
            Console.WriteLine($"[Pipeline] Candidate: {candidateName} ({candidateEmail})");

            switch (completedStage.ToUpper())
            {
                case "NLP_REVIEW":
                    bool passedNlp = score >= cvThreshold;
                    Console.WriteLine($"[Pipeline] NLP Passed: {passedNlp} (score={score} threshold={cvThreshold})");
                    if (passedNlp)
                    {
                        Console.WriteLine($"[Pipeline] Advancing NLP_REVIEW -> ENGLISH_TEST_PENDING");
                        // FORCE English exam as the next step after NLP Review
                        var englishExam = await _examSeedService.EnsureEnglishExamForJob(jobPosting.Id);
                        
                        application.CurrentPipelineStage  = "ENGLISH_TEST_PENDING";
                        application.ApplicationStatus     = "ENGLISH_TEST_PENDING";
                        application.PipelineStageUpdatedAt = DateTime.UtcNow;
                        await _applicationRepo.UpdateAsync(application);

                        var token = _tokenService.GenerateToken(application.CandidateId, englishExam.Id);
                        await CreateAssignment(application, englishExam, token);

                        var link = $"{_examSettings.ExamBaseUrl}/{token}";
                        await SendEmailSafe(candidateEmail,
                            $"İngilizce Testi Daveti — {jobTitle} | CVNokta",
                            EmailTemplateService.GetEnglishTestInviteTemplate(candidateName, jobTitle, englishThreshold)
                                .Replace("Sisteme giriş yaparak", $"<a href='{link}'>Buraya tıklayarak</a> veya sisteme giriş yaparak"));
                    }
                    else
                    {
                        // Rejection reason: combine score info + AI feedback
                        var rejectionReason = $"CV analiz skorunuz ({score:0}), bu ilan için gerekli minimum eşiğin ({cvThreshold}) altında kalmıştır.";
                        if (!string.IsNullOrWhiteSpace(cvFeedback))
                            rejectionReason += $" AI Değerlendirmesi: {cvFeedback}";

                        application.CurrentPipelineStage  = "REJECTED_NLP";
                        application.ApplicationStatus     = "REJECTED";
                        application.RejectionReason       = rejectionReason;
                        application.PipelineStageUpdatedAt = DateTime.UtcNow;
                        await _applicationRepo.UpdateAsync(application);
                        await SendEmailSafe(candidateEmail,
                            $"Başvurunuz Hakkında — {jobTitle} | CVNokta",
                            EmailTemplateService.GetPipelineRejectionTemplate(
                                candidateName, jobTitle, "CV Analizi", (int)score, cvThreshold, cvFeedback));
                    }
                    break;

                case "ENGLISH_TEST":
                    bool passedEnglish = score >= englishThreshold;
                    Console.WriteLine($"[Pipeline] English Passed: {passedEnglish} (score={score} threshold={englishThreshold})");
                    if (passedEnglish)
                    {
                        Console.WriteLine($"[Pipeline] Advancing ENGLISH_TEST -> SKILLS_TEST_PENDING");
                        application.CurrentPipelineStage  = "SKILLS_TEST_PENDING";
                        application.ApplicationStatus     = "SKILLS_TEST_PENDING";
                        application.PipelineStageUpdatedAt = DateTime.UtcNow;
                        await _applicationRepo.UpdateAsync(application);

                        // Create Technical Assignment
                        var exam = await _examSeedService.EnsureTechnicalExam(jobPosting.Id);
                        var token = _tokenService.GenerateToken(application.CandidateId, exam.Id);
                        await CreateAssignment(application, exam, token);

                        var link = $"{_examSettings.ExamBaseUrl}/{token}";
                        await SendEmailSafe(candidateEmail,
                            $"Teknik Testi Daveti — {jobTitle} | CVNokta",
                            EmailTemplateService.GetSkillsTestInviteTemplate(candidateName, jobTitle, technicalThreshold)
                                .Replace("Sisteme giriş yaparak", $"<a href='{link}'>Buraya tıklayarak</a> veya sisteme giriş yaparak"));
                    }
                    else
                    {
                        // 🤖 Get REAL AI Feedback
                        string aiFeedback = "Sınav sonucunuz sistem tarafından değerlendirildi.";
                        try {
                            aiFeedback = await _aiService.GetExamFeedbackAsync(application.Id, jobTitle, 10, (int)(score/10) , score, false, results ?? new List<QuestionResultDto>());
                        } catch { }

                        application.CurrentPipelineStage  = "REJECTED_ENGLISH";
                        application.ApplicationStatus     = "REJECTED";
                        application.RejectionReason       = aiFeedback;
                        application.PipelineStageUpdatedAt = DateTime.UtcNow;
                        await _applicationRepo.UpdateAsync(application);
                        await SendEmailSafe(candidateEmail,
                            $"Başvurunuz Hakkında — {jobTitle} | CVNokta",
                            EmailTemplateService.GetPipelineRejectionTemplate(candidateName, jobTitle, "İngilizce Testi", (int)score, englishThreshold, aiFeedback));
                    }
                    break;

                case "SKILLS_TEST":
                    bool passedTechnical = score >= technicalThreshold;
                    Console.WriteLine($"[Pipeline] Technical Passed: {passedTechnical} (score={score} threshold={technicalThreshold})");
                    if (passedTechnical)
                    {
                        Console.WriteLine($"[Pipeline] Advancing SKILLS_TEST -> AI_INTERVIEW_PENDING");
                        application.CurrentPipelineStage  = "AI_INTERVIEW_PENDING";
                        application.ApplicationStatus     = "AI_INTERVIEW_PENDING";
                        application.PipelineStageUpdatedAt = DateTime.UtcNow;
                        await _applicationRepo.UpdateAsync(application);
                        
                        var interviewUrl = $"{_examSettings.InterviewBaseUrl}/{application.Id}";
                        try {
                            System.IO.File.AppendAllText(@"C:\Users\dici-\OneDrive\Masaüstü\pipeline_log.txt", $"[{DateTime.UtcNow}] SKILLS_TEST Passed. candidateEmail: '{candidateEmail}', interviewUrl: '{interviewUrl}'\n");
                        } catch { }

                        await SendEmailSafe(candidateEmail,
                            $"Mülakat Davetiniz ({DateTime.UtcNow.Ticks}) — {jobTitle}",
                            EmailTemplateService.GetAiInterviewInviteTemplate(candidateName, jobTitle, aiInterviewThreshold, interviewUrl));
                    }
                    else
                    {
                        // 🤖 Get REAL AI Feedback
                        string aiFeedback = "Sınav sonucunuz sistem tarafından değerlendirildi.";
                        try {
                            aiFeedback = await _aiService.GetExamFeedbackAsync(application.Id, jobTitle, 10, (int)(score/10), score, false, results ?? new List<QuestionResultDto>());
                        } catch { }

                        application.CurrentPipelineStage  = "REJECTED_SKILLS";
                        application.ApplicationStatus     = "REJECTED";
                        application.RejectionReason       = aiFeedback;
                        application.PipelineStageUpdatedAt = DateTime.UtcNow;
                        await _applicationRepo.UpdateAsync(application);
                        await SendEmailSafe(candidateEmail,
                            $"Başvurunuz Hakkında — {jobTitle} | CVNokta",
                            EmailTemplateService.GetPipelineRejectionTemplate(candidateName, jobTitle, "Genel Beceri Testi", (int)score, technicalThreshold, aiFeedback));
                    }
                    break;

                case "AI_INTERVIEW":
                    bool passedAiInterview = score >= aiInterviewThreshold;
                    Console.WriteLine($"[Pipeline] AI Interview Passed: {passedAiInterview} (score={score} threshold={aiInterviewThreshold})");
                    if (passedAiInterview)
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
                        application.RejectionReason       = $"AI mülakat skorunuz ({score:0}), gerekli minimum eşiğin ({aiInterviewThreshold}) altında kalmıştır.";
                        application.PipelineStageUpdatedAt = DateTime.UtcNow;
                        await _applicationRepo.UpdateAsync(application);
                        await SendEmailSafe(candidateEmail,
                            $"Başvurunuz Hakkında — {jobTitle} | CVNokta",
                            EmailTemplateService.GetPipelineRejectionTemplate(candidateName, jobTitle, "AI Mülakat", (int)score, aiInterviewThreshold));
                    }
                    break;
            }
        }


        private async Task CreateAssignment(JobApplication app, Exam exam, string token)
        {
            var assignment = new CandidateExamAssignment
            {
                Id                = Guid.NewGuid(),
                CandidateId       = app.CandidateId,
                ExamId            = exam.Id,
                JobId             = app.JobPostingId,
                Token             = token,
                AssignmentBatchId = Guid.NewGuid(),
                Status            = "pending",
                SentAt            = DateTime.UtcNow,
                ExpiresAt         = DateTime.UtcNow.AddHours(168) // 7 days default
            };
            await _assignmentRepo.AddAsync(assignment);
        }

        private async Task SendEmailSafe(string to, string subject, string html)
        {
            if (string.IsNullOrWhiteSpace(to)) return;
            try
            {
                await _emailService.SendAsync(new EmailRequest { To = to, Subject = subject, Body = html });
            }
            catch (Exception ex)
            { 
                Console.Error.WriteLine($"[PipelineService] Email failed to {to}: {ex.Message}");
                try {
                    System.IO.File.AppendAllText(@"C:\Users\dici-\OneDrive\Masaüstü\email_error_log.txt", $"[{DateTime.UtcNow}] Email to {to} failed: {ex.Message}\n");
                } catch { }
            }
        }
    }
}
