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
        /// Dış sistem tarafından yönetilen video mülakat verisinin (sorular, cevaplar, linkler vb.) backend'e aktarılmasını (sync) sağlar.
        /// POST /api/v1/VideoInterviews/sync
        /// </summary>
        [HttpPost("sync")]
        [AllowAnonymous] // Depending on webhook security, it might be anonymous or require an API key/token. Adjust as needed.
        public async Task<IActionResult> Sync([FromBody] SyncVideoInterviewCommand command)
        {
            return Ok(await Mediator.Send(command));
        }
    }
}
