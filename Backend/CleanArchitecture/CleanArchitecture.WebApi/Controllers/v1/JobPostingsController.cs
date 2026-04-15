using CleanArchitecture.Core.Features.JobPostings.Commands.CreateJobPosting;
using CleanArchitecture.Core.Features.JobPostings.Commands.PublishJobPosting;
using CleanArchitecture.Core.Features.JobPostings.Commands.UpdateJobPostingStatus;
using CleanArchitecture.Core.Features.JobPostings.Commands.UpdateJobPosting;
using CleanArchitecture.Core.Features.JobPostings.Commands.DeleteJobPosting;
using CleanArchitecture.Core.Features.JobPostings.Queries.GetActiveJobPostings;
using CleanArchitecture.Core.Features.JobPostings.Queries.GetDashboardJobs;
using CleanArchitecture.Core.Features.JobPostings.Queries.GetDashboardSummary;
using CleanArchitecture.Core.Features.JobPostings.Queries.GetJobPostingById;
using CleanArchitecture.Core.Features.JobPostings.Queries.GetMyJobPostings;
using CleanArchitecture.Application.Features.JobPostings.Queries.GenerateJobPostingDetails;
using CleanArchitecture.Application.Features.JobPostings.Queries.GenerateEnglishExam;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace CleanArchitecture.WebApi.Controllers.v1
{
    [ApiVersion("1.0")]
    public class JobPostingsController : BaseApiController
    {
        // ─── PUBLIC ──────────────────────────────────────────────────────────────

        /// <summary>
        /// Aktif iş ilanlarını listeler. Sayfalama, arama ve filtreler desteklenir.
        /// </summary>
        /// <remarks>
        /// Query parametreleri:
        /// - pageNumber (default: 1)
        /// - pageSize (default: 10)
        /// - searchTerm: Başlık/departman araması
        /// - location: Şehir filtresi
        /// - workType: FullTime | PartTime | Contract | Internship
        ///
        /// Örnek: GET /api/v1/JobPostings/public?pageNumber=1&amp;pageSize=10&amp;searchTerm=developer&amp;location=Antalya
        /// </remarks>
        /// <returns>Sayfalı aktif iş ilanları listesi</returns>
        [HttpGet("public")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(object), 200)]
        public async Task<IActionResult> GetPublicJobList([FromQuery] GetActiveJobPostingsQuery query)
        {
            return Ok(await Mediator.Send(query));
        }

        /// <summary>
        /// Belirtilen iş ilanının tüm detaylarını döner (Hakkımızda, Sorumluluklar, Nitelikler, Faydalar).
        /// </summary>
        /// <param name="id">İş ilanı Id'si (GUID)</param>
        /// <returns>İş ilanı detay bilgisi</returns>
        [HttpGet("public/{id}")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetPublicJobDetail(Guid id)
        {
            var result = await Mediator.Send(new GetJobPostingByIdQuery { Id = id });
            if (result == null) return NotFound(new { Message = "İş ilanı bulunamadı." });
            return Ok(result);
        }

        // ─── PRIVATE (JWT gerekli) ────────────────────────────────────────────────

        /// <summary>
        /// Yeni bir iş ilanı oluşturur.
        /// </summary>
        /// <remarks>
        /// SaveAsDraft = true → Taslak olarak kaydeder (yayınlamaz).
        /// SaveAsDraft = false → Doğrudan yayınlar.
        ///
        /// Örnek istek:
        ///
        ///     POST /api/v1/JobPostings
        ///     {
        ///         "jobTitle": "Backend Developer",
        ///         "department": "Engineering",
        ///         "location": "İstanbul",
        ///         "workType": "FullTime",
        ///         "workModel": "Hybrid",
        ///         "aboutCompany": "Şirket hakkında kısa bilgi.",
        ///         "aboutRole": "Rol hakkında bilgi.",
        ///         "responsibilities": "...",
        ///         "requiredQualifications": "...",
        ///         "requiredSkills": "C#, .NET",
        ///         "salaryMin": 50000,
        ///         "salaryMax": 80000,
        ///         "totalPositions": 2,
        ///         "benefits": "Sağlık Sigortası, Yemek Kartı",
        ///         "saveAsDraft": false
        ///     }
        /// </remarks>
        /// <returns>Oluşturulan iş ilanının Id'si</returns>
        [HttpPost]
        [Authorize(Roles = "HiringManager,SuperAdmin")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> Create([FromBody] CreateJobPostingCommand command)
        {
            var result = await Mediator.Send(command);
            return Ok(result);
        }

        /// <summary>
        /// İlanı düzenler.
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "HiringManager,SuperAdmin")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateJobPostingCommand command)
        {
            if (id != command.Id) return BadRequest("URL id ile body id eşleşmiyor.");
            var result = await Mediator.Send(command);
            if (!result.Success) return BadRequest(result);
            return Ok(result);
        }

        /// <summary>
        /// Taslak bir iş ilanını yayına alır.
        /// </summary>
        /// <param name="id">Yayınlanacak iş ilanının Id'si (GUID)</param>
        /// <returns>Yayınlama başarı durumu</returns>
        [HttpPut("{id}/publish")]
        [Authorize(Roles = "HiringManager,SuperAdmin")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> Publish(Guid id)
        {
            var result = await Mediator.Send(new PublishJobPostingCommand { Id = id });
            if (!result.Success) return BadRequest(result);
            return Ok(result);
        }

        /// <summary>
        /// İlanın durumunu değiştirir (Active ↔ Closed).
        /// </summary>
        /// <param name="id">İş ilanı Id'si (GUID)</param>
        /// <param name="command">Yeni durum (newStatus: "Active" | "Closed")</param>
        /// <returns>Durum güncelleme başarı bilgisi</returns>
        [HttpPut("{id}/status")]
        [Authorize(Roles = "HiringManager,SuperAdmin")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateJobPostingStatusCommand command)
        {
            if (id != command.Id) return BadRequest("URL id ile body id eşleşmiyor.");
            return Ok(await Mediator.Send(command));
        }

        /// <summary>
        /// İlanı siler (Soft Delete).
        /// </summary>
        /// <param name="id">İş ilanı Id'si (GUID)</param>
        /// <returns>Silme başarı durumu</returns>
        [HttpDelete("{id}")]
        [Authorize(Roles = "HiringManager,SuperAdmin")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await Mediator.Send(new DeleteJobPostingCommand { Id = id });
            if (!result) return BadRequest(new { Message = "İlan silinemedi veya bulunamadı." });
            return Ok(new { Success = true });
        }

        /// <summary>
        /// Tek bir iş ilanının detaylarını getirir (düzenleme / önizleme için).
        /// </summary>
        /// <param name="id">İş ilanı Id'si (GUID)</param>
        /// <returns>İş ilanı detay bilgisi</returns>
        [HttpGet("{id}")]
        [Authorize]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await Mediator.Send(new GetJobPostingByIdQuery { Id = id });
            if (result == null) return NotFound();
            return Ok(result);
        }

        /// <summary>
        /// Oturum açmış İK kullanıcısının ilanlarını listeler (aktif + taslak).
        /// </summary>
        /// <param name="statusFilter">Filtre: All | Active | Draft | Closed (default: All)</param>
        /// <returns>İK kullanıcısına ait iş ilanları listesi</returns>
        [HttpGet("mine")]
        [Authorize(Roles = "HiringManager,SuperAdmin")]
        [ProducesResponseType(typeof(object), 200)]
        public async Task<IActionResult> GetMine([FromQuery] string statusFilter = "All")
        {
            return Ok(await Mediator.Send(new GetMyJobPostingsQuery { StatusFilter = statusFilter }));
        }

        /// <summary>
        /// İK Dashboard - Üst kısımdaki özet istatistik kartları (toplam başvuru, aktif ilan, vs.).
        /// </summary>
        /// <returns>Dashboard özet istatistikleri (TotalApplications, ActivePostings, HighMatchCandidates, PendingEvaluations)</returns>
        [HttpGet("dashboard/overview")]
        [Authorize(Roles = "HiringManager,SuperAdmin")]
        [ProducesResponseType(typeof(object), 200)]
        public async Task<IActionResult> GetDashboardOverview()
        {
            return Ok(await Mediator.Send(new GetDashboardSummaryQuery()));
        }

        /// <summary>
        /// İK Dashboard - Alt kısımdaki ilan listesi (NLP, Aday, Mülakat istatistikleriyle birlikte).
        /// </summary>
        /// <param name="query">Sayfalama parametreleri (pageNumber, pageSize)</param>
        /// <returns>Sayfalı iş ilanı listesi (her ilan için başvuru sayısı, NLP skor ortalaması, mülakat sayısı)</returns>
        [HttpGet("dashboard/list")]
        [Authorize(Roles = "HiringManager,SuperAdmin")]
        [ProducesResponseType(typeof(object), 200)]
        public async Task<IActionResult> GetDashboardJobList([FromQuery] GetDashboardJobsQuery query)
        {
            return Ok(await Mediator.Send(query));
        }

        /// <summary>
        /// HR'ın girdiği bağlam metni (applicationContext) üzerinden yapay zeka ile iş ilanı taslağı oluşturur.
        /// </summary>
        /// <remarks>
        /// Örnek istek:
        ///
        ///     POST /api/v1/JobPostings/generate-details
        ///     {
        ///         "applicationContext": "Fintech şirketi için 3 yıl deneyimli .NET backend developer arıyoruz."
        ///     }
        ///
        /// Dönen nesne: jobTitle, department, location, workType, workModel, aboutCompany, aboutRole,
        /// responsibilities, requiredQualifications, requiredSkills, salaryMin, salaryMax, totalPositions, benefits
        /// </remarks>
        /// <returns>Yapay zeka tarafından oluşturulmuş iş ilanı taslak bilgileri</returns>
        [HttpPost("generate-details")]
        [Authorize(Roles = "HiringManager,SuperAdmin")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> GenerateJobPostingDetails([FromBody] GenerateJobPostingDetailsQuery query)
        {
            return Ok(await Mediator.Send(query));
        }

        /// <summary>
        /// HR'ın girdiği sınav beklentisi (testContext) üzerinden İngilizce test soruları üretir (Mock / AI destekli).
        /// </summary>
        /// <remarks>
        /// Örnek istek:
        ///
        ///     POST /api/v1/JobPostings/generate-exam
        ///     {
        ///         "testContext": "Bu iş için temel İngilizce iletişim ve C# bilgisi gerekiyor, 3 soru hazırla."
        ///     }
        ///
        /// Dönen nesne: title, description, questions (questionText, options[], correctAnswer)
        /// </remarks>
        /// <returns>Sınav başlığı, açıklaması ve çoktan seçmeli soru listesi</returns>
        [HttpPost("generate-exam")]
        [Authorize(Roles = "HiringManager,SuperAdmin")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> GenerateEnglishExam([FromBody] GenerateEnglishExamQuery query)
        {
            return Ok(await Mediator.Send(query));
        }

    }
}
