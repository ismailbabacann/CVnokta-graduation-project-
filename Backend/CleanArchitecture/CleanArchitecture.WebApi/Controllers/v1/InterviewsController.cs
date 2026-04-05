using CleanArchitecture.Core.Features.Interviews.Commands.CompleteAiInterview;
using CleanArchitecture.Core.Features.Interviews.Commands.StartAiInterview;
using CleanArchitecture.Core.Features.Interviews.Commands.SubmitAiInterviewAnswer;
using CleanArchitecture.Core.Features.Interviews.Queries.GetAiInterviewSummary;
using CleanArchitecture.Core.Features.Interviews.Commands.BulkInviteToInterview;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System;

namespace CleanArchitecture.WebApi.Controllers.v1
{
    [ApiVersion("1.0")]
    public class InterviewsController : BaseApiController
    {
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
    }
}
