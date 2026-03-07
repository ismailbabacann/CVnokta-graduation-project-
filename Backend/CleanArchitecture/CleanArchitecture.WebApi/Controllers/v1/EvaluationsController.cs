using CleanArchitecture.Core.Features.Evaluations.Queries.GetCandidateRankings;
using CleanArchitecture.Core.Features.Evaluations.Queries.GetFinalScorecard;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System;

namespace CleanArchitecture.WebApi.Controllers.v1
{
    [ApiVersion("1.0")]
    public class EvaluationsController : BaseApiController
    {
        /// <summary>
        /// Belirtilen iş ilanına başvuran adayları final puanlarına göre sıralı listeler.
        /// CV skoru, genel test skoru, AI mülakat skoru ve ağırlıklı final puanı yer alır.
        /// GET /api/v1/Evaluations/rankings/{jobId}
        /// </summary>
        [HttpGet("rankings/{jobId}")]
        public async Task<IActionResult> GetRankings(Guid jobId)
        {
            return Ok(await Mediator.Send(new GetCandidateRankingsQuery { JobPostingId = jobId }));
        }

        /// <summary>
        /// Belirtilen başvurunun tüm aşamalarındaki detaylı puan kartını döner.
        /// CV analizi, genel test, AI mülakat ve final ağırlıklı skor ayrıntılı gösterilir.
        /// GET /api/v1/Evaluations/scorecard/{appId}
        /// </summary>
        [HttpGet("scorecard/{appId}")]
        public async Task<IActionResult> GetScorecard(Guid appId)
        {
            return Ok(await Mediator.Send(new GetFinalScorecardQuery { ApplicationId = appId }));
        }
    }
}
