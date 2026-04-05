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
        /// Giriş yapmadan da başvuru yapılabilir.
        /// </summary>
        /// <remarks>
        /// Örnek istek:
        ///
        ///     POST /api/v1/Applications/public/apply
        ///     {
        ///         "jobPostingId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        ///         "fullName": "Ahmet Yılmaz",
        ///         "email": "ahmet@ornek.com",
        ///         "phone": "05001234567",
        ///         "location": "İstanbul",
        ///         "linkedInProfile": "https://linkedin.com/in/ahmet",
        ///         "currentCompany": "ABC Ltd.",
        ///         "cvUrl": "https://...",
        ///         "coverLetter": "Başvurum hakkında kısa not."
        ///     }
        /// </remarks>
        /// <returns>Oluşturulan başvurunun Id ve başarı durumu</returns>
        [HttpPost("public/apply")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> ApplyToJob([FromBody] ApplyToJobCommand command)
        {
            var result = await Mediator.Send(command);
            if (!result.Success) return BadRequest(result);
            return Ok(result);
        }

        /// <summary>
        /// Belirtilen adayın yaptığı tüm başvuruları listeler (başvurulan ilan adı, durum, tarih).
        /// </summary>
        /// <param name="candidateId">Aday Id'si (GUID)</param>
        /// <returns>Adayın başvuru listesi</returns>
        [HttpGet("my-applications/{candidateId}")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(object), 200)]
        public async Task<IActionResult> GetMyApplications(Guid candidateId)
        {
            return Ok(await Mediator.Send(new GetMyApplicationsQuery { CandidateId = candidateId }));
        }

        // ────────────────────────────────────────────────────────────────────────
        // HR / ADMIN ENDPOINTS (JWT gerekli)
        // ────────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Sisteme kayıtlı adayın başvurusunu iletir.
        /// </summary>
        /// <remarks>
        /// Örnek istek:
        ///
        ///     POST /api/v1/Applications
        ///     {
        ///         "jobPostingId": "3fa85f64-...",
        ///         "candidateId": "3fa85f64-...",
        ///         "cvId": "3fa85f64-..."
        ///     }
        /// </remarks>
        /// <returns>Oluşturulan başvurunun Id'si</returns>
        [HttpPost]
        [ProducesResponseType(typeof(object), 200)]
        public async Task<IActionResult> Submit([FromBody] SubmitJobApplicationCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        /// <summary>
        /// Bir başvurunun süreç aşamasını günceller (CV İnceleme → Mülakat vs.).
        /// </summary>
        /// <param name="id">Başvuru Id'si (GUID)</param>
        /// <param name="command">Yeni aşama bilgisi</param>
        /// <returns>Güncelleme başarı durumu</returns>
        [HttpPut("{id}/stage")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> UpdateStage(Guid id, [FromBody] UpdateApplicationStageCommand command)
        {
            if (id != command.ApplicationId) return BadRequest();
            return Ok(await Mediator.Send(command));
        }

        /// <summary>
        /// Bir iş ilanına gelen tüm başvuruları ve aday profil detaylarını listeler (İK paneli).
        /// </summary>
        /// <param name="jobId">İş ilanı Id'si (GUID)</param>
        /// <returns>Başvuru listesi ve aday detayları</returns>
        [HttpGet("job/{jobId}")]
        [ProducesResponseType(typeof(object), 200)]
        public async Task<IActionResult> GetByJob(Guid jobId)
        {
            return Ok(await Mediator.Send(new GetApplicationsByJobIdQuery { JobPostingId = jobId }));
        }

        /// <summary>
        /// Tekil başvurunun tüm detaylarını getirir (aday bilgileri, test + mülakat sonuçları).
        /// </summary>
        /// <param name="id">Başvuru Id'si (GUID)</param>
        /// <returns>Başvuru detay bilgisi</returns>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetDetail(Guid id)
        {
            return Ok(await Mediator.Send(new GetApplicationDetailQuery { ApplicationId = id }));
        }

        /// <summary>
        /// Aday havuzunu filtreli ve sayfalı şekilde listeler (İK paneli).
        /// </summary>
        /// <param name="query">Sayfalama ve filtre parametreleri (pageNumber, pageSize, searchTerm, jobPostingId, statusFilter)</param>
        /// <returns>Sayfalı aday havuzu listesi</returns>
        [HttpGet("pool")]
        [ProducesResponseType(typeof(object), 200)]
        public async Task<IActionResult> GetCandidatePool([FromQuery] GetCandidatePoolQuery query)
        {
            return Ok(await Mediator.Send(query));
        }

        /// <summary>
        /// Seçili başvuruların durumunu toplu olarak günceller.
        /// </summary>
        /// <remarks>
        /// Örnek istek:
        ///
        ///     POST /api/v1/Applications/bulk-status-update
        ///     {
        ///         "applicationIds": ["guid1", "guid2"],
        ///         "newStatus": "INTERVIEW_INVITED"
        ///     }
        /// </remarks>
        /// <returns>Güncelleme başarı durumu</returns>
        [HttpPost("bulk-status-update")]
        [ProducesResponseType(typeof(object), 200)]
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
