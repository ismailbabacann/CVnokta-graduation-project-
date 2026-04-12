using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Evaluations.Queries.GetCandidateRankings
{
    // Returns the candidate success rankings for a specific job posting.
    // Computed directly from application tables - no SQL View dependency.
    public class GetCandidateRankingsQuery : IRequest<IEnumerable<CandidateRankingView>>
    {
        public Guid JobPostingId { get; set; }
    }

    public class GetCandidateRankingsQueryHandler : IRequestHandler<GetCandidateRankingsQuery, IEnumerable<CandidateRankingView>>
    {
        private readonly IGenericRepositoryAsync<JobApplication> _applicationRepository;
        private readonly IGenericRepositoryAsync<CandidateProfile> _profileRepository;
        private readonly IGenericRepositoryAsync<CvAnalysisResult> _cvAnalysisRepository;

        public GetCandidateRankingsQueryHandler(
            IGenericRepositoryAsync<JobApplication> applicationRepository,
            IGenericRepositoryAsync<CandidateProfile> profileRepository,
            IGenericRepositoryAsync<CvAnalysisResult> cvAnalysisRepository)
        {
            _applicationRepository = applicationRepository;
            _profileRepository = profileRepository;
            _cvAnalysisRepository = cvAnalysisRepository;
        }

        public async Task<IEnumerable<CandidateRankingView>> Handle(GetCandidateRankingsQuery request, CancellationToken cancellationToken)
        {
            var apps = await _applicationRepository.GetAllAsync();
            var profiles = await _profileRepository.GetAllAsync();
            var analyses = await _cvAnalysisRepository.GetAllAsync();

            // Filter only applications for this job
            var jobApps = apps.Where(a => a.JobPostingId == request.JobPostingId).ToList();

            // Build ranking from applications + cv analysis + profiles (LEFT JOIN style)
            var ranked = jobApps
                .Select(a =>
                {
                    var profile = profiles.FirstOrDefault(p => p.Id == a.CandidateId);
                    var analysis = analyses.FirstOrDefault(c => c.ApplicationId == a.Id);

                    return new CandidateRankingView
                    {
                        ApplicationId = a.Id,
                        JobPostingId = a.JobPostingId,
                        CandidateId = a.CandidateId,
                        CandidateFullName = profile?.FullName ?? "Bilinmeyen Aday",
                        Email = profile?.Email ?? "",
                        CvUrl = a.CvUrl,
                        CvAnalysisScore = analysis?.AnalysisScore ?? null,
                        GeneralTestScore = null,   // separate table - future integration
                        AiInterviewScore = null,   // separate table - future integration
                        FinalWeightedScore = analysis?.AnalysisScore ?? null, // fallback to CV score
                        ApplicationStatus = a.ApplicationStatus,
                        LastUpdated = a.LastModified
                    };
                })
                .OrderByDescending(r => r.FinalWeightedScore ?? 0)
                .Select((r, i) => { r.RankPosition = i + 1; return r; })
                .ToList();

            return ranked;
        }
    }
}
