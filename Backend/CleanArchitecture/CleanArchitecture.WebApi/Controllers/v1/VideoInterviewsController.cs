using CleanArchitecture.Core.Features.VideoInterviews.Commands.SyncVideoInterview;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace CleanArchitecture.WebApi.Controllers.v1
{
    [ApiVersion("1.0")]
    public class VideoInterviewsController : BaseApiController
    {
        /// <summary>
        /// Dış sistem tarafından yönetilen video mülakat verisini backend'e aktarır (Sync / Webhook).
        /// </summary>
        /// <remarks>
        /// Bu endpoint, dış video mülakat sistemi tarafından mülakat tamamlandığında otomatik çağrılır.
        /// Soru listesi, cevaplar, video linkleri, aday ve ilan bilgileri birlikte gönderilir.
        ///
        /// Örnek istek:
        ///
        ///     POST /api/v1/VideoInterviews/sync
        ///     {
        ///         "externalInterviewId": "VID-987654321",
        ///         "candidateId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        ///         "jobPostingId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        ///         "status": "Completed",
        ///         "questions": [
        ///             {
        ///                 "questionText": "Bize kendinizden bahseder misiniz?",
        ///                 "answerText": "AI tarafından üretilmiş transkript burada yer alır.",
        ///                 "videoUrl": "https://video-system.com/recordings/abc123.mp4"
        ///             },
        ///             {
        ///                 "questionText": "Neden bu pozisyona başvurdunuz?",
        ///                 "answerText": null,
        ///                 "videoUrl": "https://video-system.com/recordings/abc124.mp4"
        ///             }
        ///         ]
        ///     }
        ///
        /// Dönen: Yeni oluşturulan VideoInterview kaydının Id'si (GUID)
        /// </remarks>
        /// <returns>Veritabanına kaydedilen video mülakat kaydının Id'si</returns>
        [HttpPost("sync")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> Sync([FromBody] SyncVideoInterviewCommand command)
        {
            return Ok(await Mediator.Send(command));
        }
    }
}
