using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Core.Wrappers;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Applications.Queries.GetCandidatePool
{
    public class GetCandidatePoolQueryHandler : IRequestHandler<GetCandidatePoolQuery, PagedResponse<CandidatePoolDto>>
    {
        private readonly IGenericRepositoryAsync<JobApplication> _applicationRepository;
        private readonly IGenericRepositoryAsync<CandidateProfile> _profileRepository;
        private readonly IGenericRepositoryAsync<JobPosting> _jobPostingRepository;
        private readonly IGenericRepositoryAsync<CandidateRankingView> _rankingRepository;
        private readonly IAuthenticatedUserService _authenticatedUserService;

        public GetCandidatePoolQueryHandler(
            IGenericRepositoryAsync<JobApplication> applicationRepository,
            IGenericRepositoryAsync<CandidateProfile> profileRepository,
            IGenericRepositoryAsync<JobPosting> jobPostingRepository,
            IGenericRepositoryAsync<CandidateRankingView> rankingRepository,
            IAuthenticatedUserService authenticatedUserService)
        {
            _applicationRepository = applicationRepository;
            _profileRepository = profileRepository;
            _jobPostingRepository = jobPostingRepository;
            _rankingRepository = rankingRepository;
            _authenticatedUserService = authenticatedUserService;
        }

        public async Task<PagedResponse<CandidatePoolDto>> Handle(GetCandidatePoolQuery request, CancellationToken cancellationToken)
        {
            var userId = _authenticatedUserService.UserId;
            
            var apps = await _applicationRepository.GetAllAsync();
            var profiles = await _profileRepository.GetAllAsync();
            // Filter jobs by the logged in Hiring Manager
            var jobs = (await _jobPostingRepository.GetAllAsync())
                        .Where(j => j.HiringManagerId == Guid.Parse(userId)).ToList();
            var rankings = await _rankingRepository.GetAllAsync();

            var query = from a in apps
                        join p in profiles on a.CandidateId equals p.Id
                        join j in jobs on a.JobPostingId equals j.Id
                        // Ensure we filter by specific job if requested
                        where !request.JobPostingId.HasValue || a.JobPostingId == request.JobPostingId.Value
                        join r in rankings on a.Id equals r.ApplicationId into rankingGroup
                        from r in rankingGroup.DefaultIfEmpty()
                        select new CandidatePoolDto
                        {
                            ApplicationId = a.Id,
                            CandidateId = a.CandidateId,
                            JobPostingId = a.JobPostingId,
                            CandidateDisplayId = p.Id.ToString().Substring(0, 8),
                            FirstName = GetFirstName(p.FullName),
                            LastName = GetLastName(p.FullName),
                            AppliedPosition = j.JobTitle,
                            ApplicationDate = a.AppliedAt,
                            ExperienceYears = p.ExperienceYears,
                            EducationLevel = p.EducationLevel,
                            NlpMatchScore = r?.CvAnalysisScore ?? 0m,
                            Email = p.Email,
                            Phone = p.Phone,
                            LinkedInProfile = p.LinkedInProfile,
                            CvUrl = a.CvUrl,
                            CoverLetter = a.CoverLetter
                        };

            // SEARCH
            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var term = request.SearchTerm.ToLower();
                query = query.Where(x => 
                    (x.FirstName + " " + x.LastName).ToLower().Contains(term) ||
                    x.AppliedPosition.ToLower().Contains(term)
                );
            }

            // SORT
            if (!string.IsNullOrWhiteSpace(request.SortBy))
            {
                query = request.SortBy.ToLower() switch
                {
                    "nlpscoredesc" => query.OrderByDescending(x => x.NlpMatchScore),
                    "nlpscoreasc" => query.OrderBy(x => x.NlpMatchScore),
                    "datedesc" => query.OrderByDescending(x => x.ApplicationDate),
                    "dateasc" => query.OrderBy(x => x.ApplicationDate),
                    _ => query.OrderByDescending(x => x.NlpMatchScore)
                };
            }
            else
            {
                query = query.OrderByDescending(x => x.NlpMatchScore);
            }

            var totalCount = query.Count();
            var totalPages = totalCount > 0 ? (int)Math.Ceiling(totalCount / (double)request.PageSize) : 0;
            
            var paginatedList = query
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToList();

            var response = new PagedResponse<CandidatePoolDto>(paginatedList, request.PageNumber, request.PageSize);
            response.TotalCount = totalCount;
            response.TotalPages = totalPages;
            
            return response;
        }

        private string GetFirstName(string fullName)
        {
            if (string.IsNullOrWhiteSpace(fullName)) return "";
            var parts = fullName.Trim().Split(' ');
            if (parts.Length == 1) return parts[0];
            return string.Join(" ", parts.Take(parts.Length - 1));
        }

        private string GetLastName(string fullName)
        {
            if (string.IsNullOrWhiteSpace(fullName)) return "";
            var parts = fullName.Trim().Split(' ');
            return parts.Last();
        }
    }
}
