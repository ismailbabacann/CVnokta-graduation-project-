using CleanArchitecture.Core.Features.JobPostings.Commands.CreateJobPosting;
using CleanArchitecture.Core.Features.JobPostings.Commands.PublishJobPosting;
using CleanArchitecture.Core.Features.JobPostings.Commands.UpdateJobPostingStatus;
using CleanArchitecture.Core.Features.JobPostings.Queries.GetActiveJobPostings;
using CleanArchitecture.Core.Features.JobPostings.Queries.GetDashboardJobs;
using CleanArchitecture.Core.Features.JobPostings.Queries.GetDashboardSummary;
using CleanArchitecture.Core.Features.JobPostings.Queries.GetJobPostingById;
using CleanArchitecture.Core.Features.JobPostings.Queries.GetMyJobPostings;
using CleanArchitecture.Application.Features.JobPostings.Queries.GenerateJobPostingDetails;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace CleanArchitecture.WebApi.Controllers.v1
{
    [ApiVersion("1.0")]
    public class JobPostingsController : BaseApiController
    {
        // ────────────────────────────────────────────────────────────────────────
        // PUBLIC ENDPOINTS (Giriş yapmadan erişilebilir)
        // ────────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Aktif iş ilanlarını listeler. Sayfalama + Arama + Filtreler desteklenir.
        /// GET /api/v1/JobPostings/public?pageNumber=1&pageSize=10&searchTerm=developer&location=Antalya&workType=FullTime
        /// </summary>
        [HttpGet("public")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublicJobList([FromQuery] GetActiveJobPostingsQuery query)
        {
            return Ok(await Mediator.Send(query));
        }

        /// <summary>
        /// Belirtilen iş ilanının tüm detaylarını döner (Hakkımızda, Sorumluluklar, Nitelikler, Faydalar).
        /// GET /api/v1/JobPostings/public/{id}
        /// </summary>
        [HttpGet("public/{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublicJobDetail(Guid id)
        {
            var result = await Mediator.Send(new GetJobPostingByIdQuery { Id = id });
            if (result == null) return NotFound(new { Message = "İş ilanı bulunamadı." });
            return Ok(result);
        }

        // ────────────────────────────────────────────────────────────────────────
        // PRIVATE ENDPOINTS (İK / Admin – JWT gerekli)
        // ────────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Yeni bir iş ilanı oluşturur.
        /// SaveAsDraft = true → Taslak olarak kaydeder.
        /// SaveAsDraft = false → Yayınlar.
        /// POST /api/v1/JobPostings
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "HiringManager,SuperAdmin")]
        public async Task<IActionResult> Create([FromBody] CreateJobPostingCommand command)
        {
            var result = await Mediator.Send(command);
            return Ok(result);
        }

        /// <summary>
        /// Taslak bir ilanı yayına alır.
        /// PUT /api/v1/JobPostings/{id}/publish
        /// </summary>
        [HttpPut("{id}/publish")]
        [Authorize(Roles = "HiringManager,SuperAdmin")]
        public async Task<IActionResult> Publish(Guid id)
        {
            var result = await Mediator.Send(new PublishJobPostingCommand { Id = id });
            if (!result.Success) return BadRequest(result);
            return Ok(result);
        }

        /// <summary>
        /// İlanın durumunu değiştirir (Active ↔ Closed).
        /// PUT /api/v1/JobPostings/{id}/status
        /// </summary>
        [HttpPut("{id}/status")]
        [Authorize(Roles = "HiringManager,SuperAdmin")]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateJobPostingStatusCommand command)
        {
            if (id != command.Id) return BadRequest("URL id ile body id eşleşmiyor.");
            return Ok(await Mediator.Send(command));
        }

        /// <summary>
        /// Tek bir iş ilanının detaylarını getirir (düzenleme / önizleme için).
        /// GET /api/v1/JobPostings/{id}
        /// </summary>
        [HttpGet("{id}")]
        [Authorize]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await Mediator.Send(new GetJobPostingByIdQuery { Id = id });
            if (result == null) return NotFound();
            return Ok(result);
        }

        /// <summary>
        /// Oturum açmış İK kullanıcısının ilanlarını listeler (aktif + taslak).
        /// statusFilter: All | Active | Draft | Closed
        /// GET /api/v1/JobPostings/mine
        /// </summary>
        [HttpGet("mine")]
        [Authorize(Roles = "HiringManager,SuperAdmin")]
        public async Task<IActionResult> GetMine([FromQuery] string statusFilter = "All")
        {
            return Ok(await Mediator.Send(new GetMyJobPostingsQuery { StatusFilter = statusFilter }));
        }

        /// <summary>
        /// İK Dashboard - Üst kısımdaki toplam istatistik kartları.
        /// GET /api/v1/JobPostings/dashboard/overview
        /// </summary>
        [HttpGet("dashboard/overview")]
        [Authorize(Roles = "HiringManager,SuperAdmin")]
        public async Task<IActionResult> GetDashboardOverview()
        {
            return Ok(await Mediator.Send(new GetDashboardSummaryQuery()));
        }

        /// <summary>
        /// İK Dashboard - Alt kısımdaki ilan listesi (NLP, Aday, Mülakat istatistikleriyle).
        /// GET /api/v1/JobPostings/dashboard/list
        /// </summary>
        [HttpGet("dashboard/list")]
        [Authorize(Roles = "HiringManager,SuperAdmin")]
        public async Task<IActionResult> GetDashboardJobList([FromQuery] GetDashboardJobsQuery query)
        {
            return Ok(await Mediator.Send(query));
        }

        /// <summary>
        /// İK'nın girdiği Application Context üzerinden yapay zeka ile iş ilanı detaylarını doldurmak için taslak oluşturur.
        /// POST /api/v1/JobPostings/generate-details
        /// </summary>
        [HttpPost("generate-details")]
        [Authorize(Roles = "HiringManager,SuperAdmin")]
        public async Task<IActionResult> GenerateJobPostingDetails([FromBody] GenerateJobPostingDetailsQuery query)
        {
            return Ok(await Mediator.Send(query));
        }

    }
}
