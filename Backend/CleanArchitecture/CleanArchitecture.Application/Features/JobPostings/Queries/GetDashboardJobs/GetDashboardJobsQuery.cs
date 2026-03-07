using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Filters;
using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Core.Wrappers;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.JobPostings.Queries.GetDashboardJobs
{
    public class DashboardJobDto
    {
        public Guid JobId { get; set; }
        public string DisplayId { get; set; } // e.g. SEC-2024-001
        public string JobTitle { get; set; }
        public string Department { get; set; }
        public string Location { get; set; }
        public string WorkModel { get; set; }
        public int TotalApplications { get; set; }
        public int TotalInterviews { get; set; }
        public string NlpScoreSummary { get; set; } // "%85 Üstü: 26 Aday"
        public decimal NlpScorePercentage { get; set; } // Progress bar için (0-100)
        public string Status { get; set; } // Aktif, Beklemede, Taslak
    }

    public class GetDashboardJobsQuery : RequestParameter, IRequest<PagedResponse<DashboardJobDto>>
    {
        public string SearchTerm { get; set; }
        public string DepartmentFilter { get; set; }
        public string StatusFilter { get; set; }
    }

    public class GetDashboardJobsQueryHandler : IRequestHandler<GetDashboardJobsQuery, PagedResponse<DashboardJobDto>>
    {
        private readonly IGenericRepositoryAsync<JobPosting> _jobRepository;
        private readonly IGenericRepositoryAsync<JobApplication> _appRepository;
        private readonly IGenericRepositoryAsync<CandidateRankingView> _rankingRepository;

        public GetDashboardJobsQueryHandler(
            IGenericRepositoryAsync<JobPosting> jobRepository,
            IGenericRepositoryAsync<JobApplication> appRepository,
            IGenericRepositoryAsync<CandidateRankingView> rankingRepository)
        {
            _jobRepository = jobRepository;
            _appRepository = appRepository;
            _rankingRepository = rankingRepository;
        }

        public async Task<PagedResponse<DashboardJobDto>> Handle(GetDashboardJobsQuery request, CancellationToken cancellationToken)
        {
            var jobs = await _jobRepository.GetAllAsync();
            var apps = await _appRepository.GetAllAsync();
            var rankings = await _rankingRepository.GetAllAsync();

            var query = jobs.AsQueryable();

            if (!string.IsNullOrEmpty(request.SearchTerm))
            {
                var term = request.SearchTerm.ToLower();
                query = query.Where(j => j.JobTitle.ToLower().Contains(term));
            }

            if (!string.IsNullOrEmpty(request.DepartmentFilter) && request.DepartmentFilter != "All")
            {
                query = query.Where(j => j.Department == request.DepartmentFilter);
            }

            if (!string.IsNullOrEmpty(request.StatusFilter) && request.StatusFilter != "All")
            {
                query = query.Where(j => j.Status == request.StatusFilter);
            }

            // A-Z or Newest first
            query = query.OrderByDescending(j => j.Created);

            var totalCount = query.Count();
            var totalPages = totalCount > 0 ? (int)Math.Ceiling(totalCount / (double)request.PageSize) : 0;

            var pagedJobs = query.Skip((request.PageNumber - 1) * request.PageSize).Take(request.PageSize).ToList();

            var resultList = new List<DashboardJobDto>();

            foreach(var job in pagedJobs)
            {
                var jobApps = apps.Where(a => a.JobPostingId == job.Id).ToList();
                var jobRankings = rankings.Where(r => r.JobPostingId == job.Id && r.CvAnalysisScore.HasValue).ToList();

                int totalInterviews = jobApps.Count(a => a.ApplicationStatus == "INTERVIEW_INVITED" || a.ApplicationStatus == "HIRED");
                
                // NLP Skoru Yüksek (örneğin %80 veya %85 üstü)
                int highScoresCount = jobRankings.Count(r => r.CvAnalysisScore.Value >= 80);
                string nlpSummary = highScoresCount > 0 ? $"%80 Üstü: {highScoresCount} Aday" : "Hesaplanıyor...";
                
                decimal nlpPercent = jobApps.Count > 0 ? Math.Min(100, Math.Round((decimal)highScoresCount / jobApps.Count * 100)) : 0;

                string displayId = job.JobTitle.Length >= 3 ? job.JobTitle.Substring(0, 3).ToUpper() + "-" + job.Id.ToString().Substring(0, 4) : "JOB-" + job.Id.ToString().Substring(0,4);

                resultList.Add(new DashboardJobDto
                {
                    JobId = job.Id,
                    DisplayId = "#" + displayId,
                    JobTitle = job.JobTitle,
                    Department = job.Department,
                    Location = job.Location,
                    WorkModel = job.WorkModel,
                    Status = job.Status,
                    TotalApplications = jobApps.Count,
                    TotalInterviews = totalInterviews,
                    NlpScoreSummary = nlpSummary,
                    NlpScorePercentage = nlpPercent
                });
            }

            var response = new PagedResponse<DashboardJobDto>(resultList, request.PageNumber, request.PageSize)
            {
                TotalCount = totalCount,
                TotalPages = totalPages
            };

            return response;
        }
    }
}
