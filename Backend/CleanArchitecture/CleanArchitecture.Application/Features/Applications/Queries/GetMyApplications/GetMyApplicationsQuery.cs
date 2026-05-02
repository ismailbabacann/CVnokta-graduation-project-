using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Core.Features.Feedback.Queries.GetFeedback;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Applications.Queries.GetMyApplications
{
    // ─────────────────────────────────────────────────────────────────────────
    // DTO – Adayın kendi başvurularını listelerken dönen model
    // ─────────────────────────────────────────────────────────────────────────
    public class MyApplicationDto
    {
        public Guid   ApplicationId        { get; set; }
        public Guid   JobPostingId         { get; set; }
        public string JobTitle             { get; set; }
        public string Department           { get; set; }
        public string Location             { get; set; }
        public string WorkType             { get; set; }
        /// <summary>Legacy status field — kept for backward compatibility.</summary>
        public string ApplicationStatus    { get; set; }
        /// <summary>
        /// Pipeline stage: NLP_REVIEW | SKILLS_TEST_PENDING | ENGLISH_TEST_PENDING |
        /// AI_INTERVIEW_PENDING | COMPLETED | REJECTED_NLP | REJECTED_SKILLS | REJECTED_ENGLISH | REJECTED_AI
        /// </summary>
        public string CurrentPipelineStage { get; set; }
        /// <summary>Human-readable rejection reason when stage starts with REJECTED_.</summary>
        public string RejectionReason      { get; set; }
        /// <summary>Token for the active exam at this stage (if any).</summary>
        public string ActiveExamToken      { get; set; }
        /// <summary>One-time AI interview token (only present when stage is AI_INTERVIEW_PENDING).</summary>
        public string InterviewToken       { get; set; }
        public DateTime AppliedAt          { get; set; }

        // ── AI Interview feedback (visible to candidate after completion/rejection) ──
        public string AiInterviewStrengths   { get; set; }
        public string AiInterviewWeaknesses  { get; set; }
        public string AiInterviewSummary     { get; set; }

        // ── Per-stage candidate feedback (dual-perspective, candidate side only) ──
        public List<StageFeedbackDto> CandidateFeedbacks { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Query
    // ─────────────────────────────────────────────────────────────────────────
    /// <summary>
    /// Adayın kendi iş başvurularını listeler.
    /// GET /api/v1/Applications/my-applications/{candidateId}
    /// </summary>
    public class GetMyApplicationsQuery : IRequest<IEnumerable<MyApplicationDto>>
    {
        public Guid CandidateId { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Handler
    // ─────────────────────────────────────────────────────────────────────────
    public class GetMyApplicationsQueryHandler
        : IRequestHandler<GetMyApplicationsQuery, IEnumerable<MyApplicationDto>>
    {
        private readonly IGenericRepositoryAsync<JobApplication>           _applicationRepo;
        private readonly IGenericRepositoryAsync<JobPosting>               _jobPostingRepo;
        private readonly IGenericRepositoryAsync<CandidateProfile>         _candidateRepo;
        private readonly IGenericRepositoryAsync<CandidateExamAssignment>  _assignmentRepo;
        private readonly IGenericRepositoryAsync<AiInterviewSummary>       _interviewSummaryRepo;
        private readonly IGenericRepositoryAsync<StageFeedback>            _feedbackRepo;

        public GetMyApplicationsQueryHandler(
            IGenericRepositoryAsync<JobApplication>           applicationRepo,
            IGenericRepositoryAsync<JobPosting>       jobPostingRepo,
            IGenericRepositoryAsync<CandidateProfile> candidateRepo,
            IGenericRepositoryAsync<CandidateExamAssignment>  assignmentRepo,
            IGenericRepositoryAsync<AiInterviewSummary>       interviewSummaryRepo,
            IGenericRepositoryAsync<StageFeedback>            feedbackRepo)
        {
            _applicationRepo = applicationRepo;
            _jobPostingRepo  = jobPostingRepo;
            _candidateRepo   = candidateRepo;
            _assignmentRepo  = assignmentRepo;
            _interviewSummaryRepo = interviewSummaryRepo;
            _feedbackRepo = feedbackRepo;
        }

        public async Task<IEnumerable<MyApplicationDto>> Handle(
            GetMyApplicationsQuery request, CancellationToken cancellationToken)
        {
            var myApps        = await _applicationRepo.GetAllAsync();
            var jobPostings   = await _jobPostingRepo.GetAllAsync();
            var allCandidates = await _candidateRepo.GetAllAsync();

            var candidate        = allCandidates.FirstOrDefault(c => c.Id == request.CandidateId || c.UserId == request.CandidateId);
            var actualCandidateId = candidate?.Id ?? request.CandidateId;

            var allAssignments = await _assignmentRepo.GetAllAsync();
            var allInterviewSummaries = await _interviewSummaryRepo.GetAllAsync();
            var allFeedbacks = await _feedbackRepo.GetAllAsync();

            var result = myApps
                .Where(a => a.CandidateId == actualCandidateId)
                .OrderByDescending(a => a.AppliedAt)
                .Select(a =>
                {
                    var job = jobPostings.FirstOrDefault(j => j.Id == a.JobPostingId);
                    
                    // Find active token if in exam stage
                    string activeToken = null;
                    if (a.CurrentPipelineStage == "ENGLISH_TEST_PENDING" || a.CurrentPipelineStage == "SKILLS_TEST_PENDING")
                    {
                        var assignment = allAssignments
                            .Where(asgn => asgn.CandidateId == a.CandidateId && asgn.JobId == a.JobPostingId && asgn.Status == "pending")
                            .OrderByDescending(asgn => asgn.SentAt)
                            .FirstOrDefault();
                        activeToken = assignment?.Token;
                    }

                    // AI Interview summary
                    var interviewSummary = allInterviewSummaries
                        .Where(s => s.ApplicationId == a.Id)
                        .OrderByDescending(s => s.Created)
                        .FirstOrDefault();

                    // Only show feedback for completed or rejected stages
                    bool showFeedback = a.CurrentPipelineStage == "COMPLETED" || (a.CurrentPipelineStage?.StartsWith("REJECTED_") ?? false);

                    // Per-stage candidate feedback
                    List<StageFeedbackDto> candidateFeedbacks = null;
                    if (showFeedback)
                    {
                        var feedbacks = allFeedbacks
                            .Where(f => f.ApplicationId == a.Id)
                            .OrderBy(f => GetStageOrder(f.StageType))
                            .ToList();

                        if (feedbacks.Any())
                        {
                            candidateFeedbacks = feedbacks.Select(f => new StageFeedbackDto
                            {
                                StageType = f.StageType,
                                CandidateFeedback = new FeedbackContentDto
                                {
                                    Strengths = DeserializeList(f.CandidateStrengths),
                                    Weaknesses = DeserializeList(f.CandidateWeaknesses),
                                    Overall = f.CandidateOverall ?? ""
                                }
                            }).ToList();
                        }
                    }

                    return new MyApplicationDto
                    {
                        ApplicationId        = a.Id,
                        JobPostingId         = a.JobPostingId,
                        JobTitle             = job?.JobTitle   ?? "–",
                        Department           = job?.Department ?? "–",
                        Location             = job?.Location   ?? "–",
                        WorkType             = job?.WorkType   ?? "–",
                        ApplicationStatus    = a.ApplicationStatus,
                        CurrentPipelineStage = a.CurrentPipelineStage ?? "NLP_REVIEW",
                        RejectionReason      = a.RejectionReason,
                        ActiveExamToken      = activeToken,
                        AppliedAt            = a.AppliedAt,
                        InterviewToken       = a.CurrentPipelineStage == "AI_INTERVIEW_PENDING" ? a.AiInterviewToken : null,
                        AiInterviewStrengths = showFeedback ? interviewSummary?.Strengths : null,
                        AiInterviewWeaknesses= showFeedback ? interviewSummary?.Weaknesses : null,
                        AiInterviewSummary   = showFeedback ? interviewSummary?.SummaryText : null,
                        CandidateFeedbacks   = candidateFeedbacks,
                    };
                })
                .ToList();

            return result;
        }

        private static List<string> DeserializeList(string json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new List<string>();
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
