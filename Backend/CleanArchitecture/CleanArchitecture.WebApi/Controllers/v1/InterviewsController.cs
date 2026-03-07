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
        /// Aday mülakat akışına girer; sorular sırayla sunulur.
        /// POST /api/v1/Interviews/start
        /// Body: { "applicationId": "guid", "stageId": "guid", "jobPostingId": "guid", "cvId": "guid" }
        /// </summary>
        [HttpPost("start")]
        public async Task<IActionResult> Start([FromBody] StartAiInterviewCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        /// <summary>
        /// Devam eden AI mülakat oturumuna aday cevabı gönderir.
        /// Her soruna verilen cevap bu endpoint üzerinden iletilir.
        /// POST /api/v1/Interviews/submit-answer
        /// Body: { "sessionId": "guid", "questionId": "guid", "answerText": "..." }
        /// </summary>
        [HttpPost("submit-answer")]
        public async Task<IActionResult> SubmitAnswer([FromBody] SubmitAiInterviewAnswerCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        /// <summary>
        /// Yapay zeka mülakat oturumunu tamamlar ve değerlendirme sürecini başlatır.
        /// Tüm sorular cevaplandıktan sonra çağrılmalıdır.
        /// POST /api/v1/Interviews/complete
        /// Body: { "sessionId": "guid" }
        /// </summary>
        [HttpPost("complete")]
        public async Task<IActionResult> Complete([FromBody] CompleteAiInterviewCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        /// <summary>
        /// Tamamlanan AI mülakat oturumunun özet raporunu döner.
        /// Adayın genel skoru, güçlü/zayıf yönleri ve öneriler yer alır.
        /// GET /api/v1/Interviews/{sessionId}/summary
        /// </summary>
        [HttpGet("{sessionId}/summary")]
        public async Task<IActionResult> GetSummary(Guid sessionId)
        {
            return Ok(await Mediator.Send(new GetAiInterviewSummaryQuery { SessionId = sessionId }));
        }

        /// <summary>
        /// Seçili başvuruları toplu olarak AI mülakate davet eder.
        /// Her başvuru için durum "INTERVIEW_INVITED" olarak güncellenir ve MeetingInvitation oluşturulur.
        /// POST /api/v1/Interviews/bulk-invite
        /// Body: { "applicationIds": ["guid1", "guid2"] }
        /// </summary>
        [HttpPost("bulk-invite")]
        public async Task<IActionResult> BulkInvite([FromBody] BulkInviteToInterviewCommand command)
        {
            return Ok(await Mediator.Send(command));
        }
    }
}
