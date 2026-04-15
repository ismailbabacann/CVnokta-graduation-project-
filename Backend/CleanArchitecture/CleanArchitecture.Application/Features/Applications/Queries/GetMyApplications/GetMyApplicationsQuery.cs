using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
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
        public DateTime AppliedAt          { get; set; }
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
        private readonly IGenericRepositoryAsync<JobApplication>   _applicationRepo;
        private readonly IGenericRepositoryAsync<JobPosting>       _jobPostingRepo;
        private readonly IGenericRepositoryAsync<CandidateProfile> _candidateRepo;

        public GetMyApplicationsQueryHandler(
            IGenericRepositoryAsync<JobApplication>   applicationRepo,
            IGenericRepositoryAsync<JobPosting>       jobPostingRepo,
            IGenericRepositoryAsync<CandidateProfile> candidateRepo)
        {
            _applicationRepo = applicationRepo;
            _jobPostingRepo  = jobPostingRepo;
            _candidateRepo   = candidateRepo;
        }

        public async Task<IEnumerable<MyApplicationDto>> Handle(
            GetMyApplicationsQuery request, CancellationToken cancellationToken)
        {
            var myApps        = await _applicationRepo.GetAllAsync();
            var jobPostings   = await _jobPostingRepo.GetAllAsync();
            var allCandidates = await _candidateRepo.GetAllAsync();

            var candidate        = allCandidates.FirstOrDefault(c => c.Id == request.CandidateId || c.UserId == request.CandidateId);
            var actualCandidateId = candidate?.Id ?? request.CandidateId;

            var result = myApps
                .Where(a => a.CandidateId == actualCandidateId)
                .OrderByDescending(a => a.AppliedAt)
                .Select(a =>
                {
                    var job = jobPostings.FirstOrDefault(j => j.Id == a.JobPostingId);
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
                        AppliedAt            = a.AppliedAt
                    };
                })
                .ToList();

            return result;
        }
    }
}
