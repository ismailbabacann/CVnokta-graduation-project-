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
        private readonly IAuthenticatedUserService _authenticatedUserService;

        public GetCandidatePoolQueryHandler(
            IGenericRepositoryAsync<JobApplication> applicationRepository,
            IGenericRepositoryAsync<CandidateProfile> profileRepository,
            IGenericRepositoryAsync<JobPosting> jobPostingRepository,
            IAuthenticatedUserService authenticatedUserService)
        {
            _applicationRepository = applicationRepository;
            _profileRepository = profileRepository;
            _jobPostingRepository = jobPostingRepository;
            _authenticatedUserService = authenticatedUserService;
        }

        public async Task<PagedResponse<CandidatePoolDto>> Handle(GetCandidatePoolQuery request, CancellationToken cancellationToken)
        {
            var userId = _authenticatedUserService.UserId;
            if (string.IsNullOrEmpty(userId))
            {
                return new PagedResponse<CandidatePoolDto>(new List<CandidatePoolDto>(), request.PageNumber, request.PageSize);
            }

            var apps = await _applicationRepository.GetAllAsync();
            var profiles = await _profileRepository.GetAllAsync();

            // SuperAdmin / Admin sees everyone; HiringManager sees only their own postings
            bool isAdmin = _authenticatedUserService.Roles != null &&
                           _authenticatedUserService.Roles.Any(r => r == "SuperAdmin" || r == "Admin");

            Guid.TryParse(userId, out var currentUserId);

            var allJobs = (await _jobPostingRepository.GetAllAsync()).ToList();
            var jobs = isAdmin
                ? allJobs
                : allJobs.Where(j => j.HiringManagerId == currentUserId).ToList();

            // LEFT JOIN: profiles olmayan adaylar da görünsün
            var query = from a in apps
                        join j in jobs on a.JobPostingId equals j.Id
                        join p in profiles on a.CandidateId equals p.Id into profileGroup
                        from p in profileGroup.DefaultIfEmpty()
                        where !request.JobPostingId.HasValue || a.JobPostingId == request.JobPostingId.Value
                        select new CandidatePoolDto
                        {
                            ApplicationId = a.Id,
                            CandidateId = a.CandidateId,
                            JobPostingId = a.JobPostingId,
                            CandidateDisplayId = a.CandidateId.ToString().Substring(0, 8),
                            FirstName = p != null ? GetFirstName(p.FullName) : "Aday",
                            LastName = p != null ? GetLastName(p.FullName) : "",
                            AppliedPosition = j.JobTitle,
                            ApplicationDate = a.AppliedAt,
                            ExperienceYears = p != null ? p.ExperienceYears : 0,
                            EducationLevel = p != null ? p.EducationLevel : "",
                            NlpMatchScore = 0m, // View bağımsız - ranking sayfasında ayrıca gösteriliyor
                            Email = p != null ? p.Email : "",
                            Phone = p != null ? p.Phone : "",
                            LinkedInProfile = p != null ? p.LinkedInProfile : "",
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
            var parts = fullName.Trim().Split(' ', System.StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length <= 1) return parts.Length == 0 ? "" : parts[0];
            // Everything except the last word is first name
            return string.Join(" ", parts.Take(parts.Length - 1));
        }

        private string GetLastName(string fullName)
        {
            if (string.IsNullOrWhiteSpace(fullName)) return "";
            var parts = fullName.Trim().Split(' ', System.StringSplitOptions.RemoveEmptyEntries);
            // If only one word, return empty to avoid duplication in UI
            if (parts.Length <= 1) return "";
            return parts.Last();
        }
    }
}
