using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Applications.Queries.GetApplicationsByJobId
{
    // ─────────────────────────────────────────────────────────────────────────
    // DTO
    // ─────────────────────────────────────────────────────────────────────────
    public class JobApplicationListDto
    {
        public Guid ApplicationId { get; set; }
        public Guid JobPostingId { get; set; }
        public Guid CandidateId { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public string Phone { get; set; }
        public string Location { get; set; }
        public string LinkedInProfile { get; set; }
        public string CurrentCompany { get; set; }
        public string CoverLetter { get; set; }
        public string CvUrl { get; set; }
        public string ApplicationStatus { get; set; }
        public DateTime AppliedAt { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Query
    // ─────────────────────────────────────────────────────────────────────────
    public class GetApplicationsByJobIdQuery : IRequest<IEnumerable<JobApplicationListDto>>
    {
        public Guid JobPostingId { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Handler
    // ─────────────────────────────────────────────────────────────────────────
    public class GetApplicationsByJobIdQueryHandler : IRequestHandler<GetApplicationsByJobIdQuery, IEnumerable<JobApplicationListDto>>
    {
        private readonly IGenericRepositoryAsync<JobApplication> _applicationRepo;
        private readonly IGenericRepositoryAsync<CandidateProfile> _profileRepo;

        public GetApplicationsByJobIdQueryHandler(
            IGenericRepositoryAsync<JobApplication> applicationRepo,
            IGenericRepositoryAsync<CandidateProfile> profileRepo)
        {
            _applicationRepo = applicationRepo;
            _profileRepo = profileRepo;
        }

        public async Task<IEnumerable<JobApplicationListDto>> Handle(GetApplicationsByJobIdQuery request, CancellationToken cancellationToken)
        {
            var apps = await _applicationRepo.GetAllAsync();
            var profiles = await _profileRepo.GetAllAsync();

            var jobApps = apps.Where(a => a.JobPostingId == request.JobPostingId);

            var result = jobApps.Select(a => {
                var candidate = profiles.FirstOrDefault(p => p.Id == a.CandidateId);
                return new JobApplicationListDto
                {
                    ApplicationId = a.Id,
                    JobPostingId = a.JobPostingId,
                    CandidateId = a.CandidateId,
                    FullName = candidate?.FullName,
                    Email = candidate?.Email,
                    Phone = candidate?.Phone,
                    Location = candidate?.Location,
                    LinkedInProfile = candidate?.LinkedInProfile,
                    CurrentCompany = candidate?.CurrentCompany,
                    CoverLetter = a.CoverLetter,
                    CvUrl = a.CvUrl,
                    ApplicationStatus = a.ApplicationStatus,
                    AppliedAt = a.AppliedAt
                };
            }).OrderByDescending(a => a.AppliedAt).ToList();

            return result;
        }
    }
}
