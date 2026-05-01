using CleanArchitecture.Core.Features.Interviews.Commands.CompleteAiInterview;
using CleanArchitecture.Core.Features.Interviews.Commands.StartAiInterview;
using CleanArchitecture.Core.Features.Interviews.Commands.SubmitAiInterviewAnswer;
using CleanArchitecture.Core.Features.Interviews.Queries.GetAiInterviewSummary;
using CleanArchitecture.Core.Features.Interviews.Commands.BulkInviteToInterview;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System;
using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using System.Linq;

namespace CleanArchitecture.WebApi.Controllers.v1
{
    [ApiVersion("1.0")]
    public class InterviewsController : BaseApiController
    {
        private readonly IGenericRepositoryAsync<JobApplication> _applicationRepo;
        private readonly IGenericRepositoryAsync<JobPosting> _jobPostingRepo;
        private readonly IGenericRepositoryAsync<CandidateProfile> _candidateRepo;

        public InterviewsController(
            IGenericRepositoryAsync<JobApplication> applicationRepo,
            IGenericRepositoryAsync<JobPosting> jobPostingRepo,
            IGenericRepositoryAsync<CandidateProfile> candidateRepo)
        {
            _applicationRepo = applicationRepo;
            _jobPostingRepo = jobPostingRepo;
            _candidateRepo = candidateRepo;
        }
        /// <summary>
        /// Belirtilen başvuru için yapay zeka mülakat oturumu başlatır.
        /// </summary>
        /// <remarks>
        /// Aday mülakat akışına girer; sorular sırayla sunulur.
        ///
        /// Örnek istek:
        ///
        ///     POST /api/v1/Interviews/start
        ///     {
        ///         "applicationId": "3fa85f64-...",
        ///         "stageId": "3fa85f64-...",
        ///         "jobPostingId": "3fa85f64-...",
        ///         "cvId": "3fa85f64-..."
        ///     }
        ///
        /// Dönen: SessionId (oturum başlatıldığında atanan GUID)
        /// </remarks>
        /// <returns>Oluşturulan AI mülakat oturumunun Id'si</returns>
        [HttpPost("start")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> Start([FromBody] StartAiInterviewCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        /// <summary>
        /// Devam eden AI mülakat oturumuna aday cevabı gönderir.
        /// </summary>
        /// <remarks>
        /// Her soruya verilen cevap bu endpoint üzerinden iletilir.
        ///
        /// Örnek istek:
        ///
        ///     POST /api/v1/Interviews/submit-answer
        ///     {
        ///         "sessionId": "3fa85f64-...",
        ///         "questionId": "3fa85f64-...",
        ///         "answerText": "Benim cevabım şu şekildedir..."
        ///     }
        /// </remarks>
        /// <returns>Cevabın kaydedildiğine dair başarı bilgisi</returns>
        [HttpPost("submit-answer")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> SubmitAnswer([FromBody] SubmitAiInterviewAnswerCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        /// <summary>
        /// Yapay zeka mülakat oturumunu tamamlar ve değerlendirme sürecini başlatır.
        /// </summary>
        /// <remarks>
        /// Tüm sorular cevaplandıktan sonra çağrılmalıdır.
        ///
        /// Örnek istek:
        ///
        ///     POST /api/v1/Interviews/complete
        ///     {
        ///         "sessionId": "3fa85f64-..."
        ///     }
        /// </remarks>
        /// <returns>Tamamlama işleminin başarı durumu</returns>
        [HttpPost("complete")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> Complete([FromBody] CompleteAiInterviewCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        /// <summary>
        /// Tamamlanan AI mülakat oturumunun özet raporunu döner.
        /// </summary>
        /// <remarks>
        /// Dönen nesne şunları içerir:
        /// - OverallInterviewScore (genel skor)
        /// - Strengths (güçlü yönler)
        /// - Weaknesses (zayıf yönler)
        /// - Recommendation (öneri)
        /// </remarks>
        /// <param name="sessionId">Mülakat oturumu Id'si (GUID)</param>
        /// <returns>AI mülakat özet raporu</returns>
        [HttpGet("{sessionId}/summary")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetSummary(Guid sessionId)
        {
            return Ok(await Mediator.Send(new GetAiInterviewSummaryQuery { SessionId = sessionId }));
        }

        /// <summary>
        /// Seçili başvuruları toplu olarak AI mülakata davet eder.
        /// </summary>
        /// <remarks>
        /// Her başvuru için durum "INTERVIEW_INVITED" olarak güncellenir ve davet kaydı oluşturulur.
        ///
        /// Örnek istek:
        ///
        ///     POST /api/v1/Interviews/bulk-invite
        ///     {
        ///         "applicationIds": ["guid1", "guid2", "guid3"]
        ///     }
        /// </remarks>
        /// <returns>Davet edilen başvuru sayısı ve başarı durumu</returns>
        [HttpPost("bulk-invite")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> BulkInvite([FromBody] BulkInviteToInterviewCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        /// <summary>
        /// Mülakat bitiminde yapay zeka veya frontend tarafından gönderilen gerçek zamanlı değerlendirme raporunu kaydeder.
        /// </summary>
        [HttpPost("save-realtime")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> SaveRealtime([FromBody] CleanArchitecture.Core.Features.Interviews.Commands.SaveRealtimeInterviewSummary.SaveRealtimeInterviewSummaryCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        /// <summary>
        /// Validates a one-time AI interview token.
        /// </summary>
        [HttpGet("validate-token/{token}")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(object), 200)]
        public async Task<IActionResult> ValidateToken(string token)
        {
            var apps = await _applicationRepo.GetAllAsync();
            var app = apps.FirstOrDefault(a => a.AiInterviewToken == token);
            if (app == null) return Ok(new { isValid = false, reason = "Token not found" });

            // Fetch relations explicitly since GetAllAsync doesn't include navigational properties
            var jobPosting = await _jobPostingRepo.GetByIdAsync(app.JobPostingId);
            var candidate = await _candidateRepo.GetByIdAsync(app.CandidateId);

            return Ok(new {
                isValid = true,
                isUsed = app.IsAiInterviewTokenUsed,
                applicationId = app.Id,
                jobPostingId = app.JobPostingId,
                candidateName = candidate?.FullName ?? "Candidate",
                jobTitle = jobPosting?.JobTitle ?? "Genel Başvuru",
                requiredSkills = jobPosting?.RequiredSkills ?? "",
                cvUrl = candidate?.CvUrl ?? ""
            });
        }

        /// <summary>
        /// Marks a one-time AI interview token as used.
        /// </summary>
        [HttpPost("mark-used/{token}")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(object), 200)]
        public async Task<IActionResult> MarkUsed(string token)
        {
            var apps = await _applicationRepo.GetAllAsync();
            var app = apps.FirstOrDefault(a => a.AiInterviewToken == token);
            if (app == null) return NotFound();

            app.IsAiInterviewTokenUsed = true;
            await _applicationRepo.UpdateAsync(app);
            return Ok(new { success = true });
        }
    }
}
