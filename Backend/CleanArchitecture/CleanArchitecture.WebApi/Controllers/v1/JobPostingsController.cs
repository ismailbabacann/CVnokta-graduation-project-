using CleanArchitecture.Core.Features.JobPostings.Commands.CreateJobPosting;
using CleanArchitecture.Core.Features.JobPostings.Commands.PublishJobPosting;
using CleanArchitecture.Core.Features.JobPostings.Commands.UpdateJobPostingStatus;
using CleanArchitecture.Core.Features.JobPostings.Queries.GetActiveJobPostings;
using CleanArchitecture.Core.Features.JobPostings.Queries.GetJobPostingById;
using CleanArchitecture.Core.Features.JobPostings.Queries.GetJobPostingsWithStats;
using CleanArchitecture.Core.Features.JobPostings.Queries.GetMyJobPostings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace CleanArchitecture.WebApi.Controllers.v1
{
    [ApiVersion("1.0")]
    public class JobPostingsController : BaseApiController
    {
        /// <summary>
        /// Yeni bir iş ilanı oluşturur.
        /// SaveAsDraft = true → Taslak Olarak Kaydet
        /// SaveAsDraft = false → Yayınla
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
        /// </summary>
        [HttpPut("{id}/status")]
        [Authorize(Roles = "HiringManager,SuperAdmin")]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateJobPostingStatusCommand command)
        {
            if (id != command.Id) return BadRequest("URL id ile body id eşleşmiyor.");
            return Ok(await Mediator.Send(command));
        }

        // ────────────────────────────────────────────────────────────────────────
        // QUERIES (Read)
        // ────────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Tek bir iş ilanının tüm detaylarını getirir (düzenleme / önizleme).
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
        /// Oturum açmış İK kullanıcısının ilanlarını listeler
        /// (aktif + taslak). statusFilter: All | Active | Draft | Closed
        /// </summary>
        [HttpGet("mine")]
        [Authorize(Roles = "HiringManager,SuperAdmin")]
        public async Task<IActionResult> GetMine([FromQuery] string statusFilter = "All")
        {
            return Ok(await Mediator.Send(new GetMyJobPostingsQuery { StatusFilter = statusFilter }));
        }

        /// <summary>
        /// Adayların görebileceği aktif iş ilanlarını listeler.
        /// </summary>
        [HttpGet("active")]
        [AllowAnonymous]
        public async Task<IActionResult> GetActive()
        {
            return Ok(await Mediator.Send(new GetActiveJobPostingsQuery()));
        }

        /// <summary>
        /// İK paneli için ilanları başvuru istatistikleriyle getirir.
        /// </summary>
        [HttpGet("stats")]
        [Authorize(Roles = "HiringManager,SuperAdmin")]
        public async Task<IActionResult> GetStats()
        {
            return Ok(await Mediator.Send(new GetJobPostingsWithStatsQuery()));
        }
    }
}
