using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Core.Wrappers;
using MediatR;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.JobPostings.Queries.GetActiveJobPostings
{
    // ─────────────────────────────────────────────────────────────────────────
    // DTO – "All Jobs" listesinde her bir kart için dönen model
    // ─────────────────────────────────────────────────────────────────────────
    public class ActiveJobListItemDto
    {
        public Guid Id { get; set; }
        public string JobTitle { get; set; }
        public string Department { get; set; }
        public string Location { get; set; }
        /// <summary>FullTime | PartTime | Contract | Internship</summary>
        public string WorkType { get; set; }
        /// <summary>Remote | Hybrid | OnSite</summary>
        public string WorkModel { get; set; }
        /// <summary>İlan açıklamasının ilk 250 karakteri (tanıtıcı özet)</summary>
        public string ShortDescription { get; set; }
        public DateTime PostedDate { get; set; }
        public DateTime? ClosingDate { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Query – Filtreleme & Sayfalama parametrelerini taşır
    // ─────────────────────────────────────────────────────────────────────────
    /// <summary>
    /// Aktif iş ilanlarını sayfalı + filtrelenmiş şekilde döner.
    /// GET /api/v1/JobPostings/public
    /// Giriş yapmadan erişilebilir (AllowAnonymous).
    /// </summary>
    public class GetActiveJobPostingsQuery : IRequest<PagedResponse<ActiveJobListItemDto>>
    {
        public int PageNumber { get; set; } = 1;
        public int PageSize  { get; set; } = 10;

        /// <summary>İlan başlığı veya departman adında arama.</summary>
        public string SearchTerm { get; set; }

        /// <summary>Lokasyon filtresi (örn: "Antalya").</summary>
        public string Location { get; set; }

        /// <summary>Çalışma tipi filtresi (FullTime | PartTime | Contract | Internship).</summary>
        public string WorkType { get; set; }

        /// <summary>Çalışma modeli filtresi (Remote | Hybrid | OnSite).</summary>
        public string WorkModel { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Handler
    // ─────────────────────────────────────────────────────────────────────────
    public class GetActiveJobPostingsQueryHandler
        : IRequestHandler<GetActiveJobPostingsQuery, PagedResponse<ActiveJobListItemDto>>
    {
        private readonly IGenericRepositoryAsync<JobPosting> _repo;

        public GetActiveJobPostingsQueryHandler(IGenericRepositoryAsync<JobPosting> repo)
            => _repo = repo;

        public async Task<PagedResponse<ActiveJobListItemDto>> Handle(
            GetActiveJobPostingsQuery request, CancellationToken cancellationToken)
        {
            var all = await _repo.GetAllAsync();

            // Sadece yayında ve kapanma tarihi geçmemiş ilanlar
            var filtered = all
                .Where(j => j.Status == "Active" && !j.IsDraft
                            && (j.ClosingDate == null || j.ClosingDate >= DateTime.UtcNow))
                .AsEnumerable();

            // Başlık veya departman araması
            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var term = request.SearchTerm.Trim().ToLower();
                filtered = filtered.Where(j =>
                    (j.JobTitle   ?? "").ToLower().Contains(term) ||
                    (j.Department ?? "").ToLower().Contains(term));
            }

            // Lokasyon filtresi
            if (!string.IsNullOrWhiteSpace(request.Location))
                filtered = filtered.Where(j =>
                    (j.Location ?? "").ToLower().Contains(request.Location.Trim().ToLower()));

            // Çalışma tipi filtresi
            if (!string.IsNullOrWhiteSpace(request.WorkType))
                filtered = filtered.Where(j =>
                    string.Equals(j.WorkType, request.WorkType.Trim(), StringComparison.OrdinalIgnoreCase));

            // Çalışma modeli filtresi
            if (!string.IsNullOrWhiteSpace(request.WorkModel))
                filtered = filtered.Where(j =>
                    string.Equals(j.WorkModel, request.WorkModel.Trim(), StringComparison.OrdinalIgnoreCase));

            // En yeni ilan üstte
            var sorted = filtered.OrderByDescending(j => j.PostedDate).ToList();

            var totalCount = sorted.Count;
            var totalPages = (int)Math.Ceiling(totalCount / (double)request.PageSize);

            var paged = sorted
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(j => new ActiveJobListItemDto
                {
                    Id               = j.Id,
                    JobTitle         = j.JobTitle,
                    Department       = j.Department,
                    Location         = j.Location,
                    WorkType         = j.WorkType,
                    WorkModel        = j.WorkModel,
                    ShortDescription = Truncate(j.AboutCompany ?? j.Responsibilities, 250),
                    PostedDate       = j.PostedDate,
                    ClosingDate      = j.ClosingDate
                })
                .ToList();

            return new PagedResponse<ActiveJobListItemDto>(paged, request.PageNumber, request.PageSize)
            {
                TotalCount = totalCount,
                TotalPages = totalPages
            };
        }

        private static string Truncate(string text, int max)
        {
            if (string.IsNullOrEmpty(text)) return string.Empty;
            return text.Length <= max ? text : text[..max] + "...";
        }
    }
}
