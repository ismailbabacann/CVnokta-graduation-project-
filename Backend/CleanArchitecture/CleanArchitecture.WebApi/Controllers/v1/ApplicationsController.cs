using CleanArchitecture.Core.Features.Applications.Commands.ApplyToJob;
using CleanArchitecture.Core.Features.Applications.Commands.BulkUpdateApplicationStatus;
using CleanArchitecture.Core.Features.Applications.Commands.SubmitJobApplication;
using CleanArchitecture.Core.Features.Applications.Commands.UpdateApplicationStage;
using CleanArchitecture.Core.Features.Applications.Queries.GetApplicationDetail;
using CleanArchitecture.Core.Features.Applications.Queries.GetApplicationsByJobId;
using CleanArchitecture.Core.Features.Applications.Queries.GetCandidatePool;
using CleanArchitecture.Core.Features.Applications.Queries.GetCandidatePoolStats;
using CleanArchitecture.Core.Features.Applications.Queries.GetMyApplications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace CleanArchitecture.WebApi.Controllers.v1
{
    [ApiVersion("1.0")]
    public class ApplicationsController : BaseApiController
    {
        // ────────────────────────────────────────────────────────────────────────
        // PUBLIC ENDPOINTS (Giriş yapmadan erişilebilir)
        // ────────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Adayın "Başvur" butonuna bastığında çağrılan endpoint.
        /// Giriş yapmadan da başvuru yapılabilir; ad, e-posta, telefon, lokasyon, şirket, linkedin ve CV url istenir.
        /// POST /api/v1/Applications/public/apply
        /// Body: { "jobPostingId": "guid", "fullName": "Ad", "email": "a@x.com", "phone": "05", "location": "İst", "linkedInProfile": "url", "currentCompany": "firma", "cvUrl": "url", "coverLetter": "mesaj" }
        /// </summary>
        [HttpPost("public/apply")]
        [AllowAnonymous]
        public async Task<IActionResult> ApplyToJob([FromBody] ApplyToJobCommand command)
        {
            var result = await Mediator.Send(command);
            if (!result.Success) return BadRequest(result);
            return Ok(result);
        }

        /// <summary>
        /// Belirtilen adayın yaptığı tüm başvuruları listeler (başvurulan ilan adı, durum, tarih).
        /// GET /api/v1/Applications/my-applications/{candidateId}
        /// </summary>
        [HttpGet("my-applications/{candidateId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetMyApplications(Guid candidateId)
        {
            return Ok(await Mediator.Send(new GetMyApplicationsQuery { CandidateId = candidateId }));
        }

        // ────────────────────────────────────────────────────────────────────────
        // HR / ADMIN ENDPOINTS (JWT gerekli)
        // ────────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Adayın kayıtlı sisteme başvuru yapması için (eski endpoint – kayıtlı kullanıcılar).
        /// POST /api/v1/Applications
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Submit([FromBody] SubmitJobApplicationCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        /// <summary>
        /// Bir başvurunun aşamasını günceller (CV İnceleme → Mülakat vs.).
        /// PUT /api/v1/Applications/{id}/stage
        /// </summary>
        [HttpPut("{id}/stage")]
        public async Task<IActionResult> UpdateStage(Guid id, [FromBody] UpdateApplicationStageCommand command)
        {
            if (id != command.ApplicationId) return BadRequest();
            return Ok(await Mediator.Send(command));
        }

        /// <summary>
        /// Bir iş ilanına gelen tüm başvuruları ve o adayların profil detaylarını (şirket, lokasyon, cvUrl vs.) listeler (İK paneli).
        /// GET /api/v1/Applications/job/{jobId}
        /// </summary>
        [HttpGet("job/{jobId}")]
        public async Task<IActionResult> GetByJob(Guid jobId)
        {
            return Ok(await Mediator.Send(new GetApplicationsByJobIdQuery { JobPostingId = jobId }));
        }

        /// <summary>
        /// Tekil başvurunun tüm detaylarını getirir (aday bilgileri, test + mülakat sonuçları).
        /// GET /api/v1/Applications/{id}
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetDetail(Guid id)
        {
            return Ok(await Mediator.Send(new GetApplicationDetailQuery { ApplicationId = id }));
        }

        /// <summary>
        /// Aday havuzunu filtreli ve sayfalı şekilde listeler (İK paneli).
        /// GET /api/v1/Applications/pool
        /// </summary>
        [HttpGet("pool")]
        public async Task<IActionResult> GetCandidatePool([FromQuery] GetCandidatePoolQuery query)
        {
            return Ok(await Mediator.Send(query));
        }

        /// <summary>
        /// Seçili başvuruların durumunu toplu olarak günceller.
        /// POST /api/v1/Applications/bulk-status-update
        /// </summary>
        [HttpPost("bulk-status-update")]
        public async Task<IActionResult> BulkStatusUpdate([FromBody] BulkUpdateApplicationStatusCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        /// <summary>
        /// Aday havuzu özet istatistiklerini döner (toplam aday, bugünkü başvuru, ortalama NLP skoru).
        /// GET /api/v1/Applications/stats/pool-summary
        /// </summary>
        [HttpGet("stats/pool-summary")]
        public async Task<IActionResult> GetPoolSummary()
        {
            return Ok(await Mediator.Send(new GetCandidatePoolStatsQuery()));
        }
    }
}
