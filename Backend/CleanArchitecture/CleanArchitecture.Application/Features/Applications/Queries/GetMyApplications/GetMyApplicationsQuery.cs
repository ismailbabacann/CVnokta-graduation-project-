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
        public Guid   ApplicationId     { get; set; }
        public Guid   JobPostingId      { get; set; }
        public string JobTitle          { get; set; }
        public string Department        { get; set; }
        public string Location          { get; set; }
        public string WorkType          { get; set; }
        /// <summary>Mevcut başvuru durumu: SUBMITTED | CV_REVIEW | INTERVIEW_INVITED | vb.</summary>
        public string ApplicationStatus { get; set; }
        public DateTime AppliedAt       { get; set; }
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
        private readonly IGenericRepositoryAsync<JobApplication> _applicationRepo;
        private readonly IGenericRepositoryAsync<JobPosting>     _jobPostingRepo;

        public GetMyApplicationsQueryHandler(
            IGenericRepositoryAsync<JobApplication> applicationRepo,
            IGenericRepositoryAsync<JobPosting>     jobPostingRepo)
        {
            _applicationRepo = applicationRepo;
            _jobPostingRepo  = jobPostingRepo;
        }

        public async Task<IEnumerable<MyApplicationDto>> Handle(
            GetMyApplicationsQuery request, CancellationToken cancellationToken)
        {
            var myApps    = await _applicationRepo.GetAllAsync();
            var jobPostings = await _jobPostingRepo.GetAllAsync();

            var result = myApps
                .Where(a => a.CandidateId == request.CandidateId)
                .OrderByDescending(a => a.AppliedAt)
                .Select(a =>
                {
                    var job = jobPostings.FirstOrDefault(j => j.Id == a.JobPostingId);
                    return new MyApplicationDto
                    {
                        ApplicationId     = a.Id,
                        JobPostingId      = a.JobPostingId,
                        JobTitle          = job?.JobTitle   ?? "–",
                        Department        = job?.Department ?? "–",
                        Location          = job?.Location   ?? "–",
                        WorkType          = job?.WorkType   ?? "–",
                        ApplicationStatus = a.ApplicationStatus,
                        AppliedAt         = a.AppliedAt
                    };
                })
                .ToList();

            return result;
        }
    }
}
