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
        [HttpGet("rankings/{jobId}")]
        public async Task<IActionResult> GetRankings(Guid jobId)
        {
            return Ok(await Mediator.Send(new GetCandidateRankingsQuery { JobPostingId = jobId }));
        }

        [HttpGet("scorecard/{appId}")]
        public async Task<IActionResult> GetScorecard(Guid appId)
        {
            return Ok(await Mediator.Send(new GetFinalScorecardQuery { ApplicationId = appId }));
        }
    }
}
