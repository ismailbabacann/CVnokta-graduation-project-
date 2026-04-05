using CleanArchitecture.Core.Features.Evaluations.Commands.SaveCvAnalysis;
using CleanArchitecture.Core.Wrappers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace CleanArchitecture.WebApi.Controllers.v1
{
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/cvanalysis")]
    [ApiController]
    public class CvAnalysisController : BaseApiController
    {
        /// <summary>
        /// NLP servisi tarafindan CV skorlarini kaydetmek uzere cagirilir.
        /// </summary>
        /// <param name="command">ApplicationId, AnalysisScore ve diger geribildirimleri icerir.</param>
        /// <returns></returns>
        [HttpPost("save-score")]
        [AllowAnonymous] // Istenildigi uzere acik / guvenliksiz birakildi
        public async Task<IActionResult> SaveScore([FromBody] SaveCvAnalysisCommand command)
        {
            var result = await Mediator.Send(command);

            if (result)
            {
                return Ok(new { Message = "Score updated successfully." });
            }

            return BadRequest(new { Message = "Operation failed. Ensure ApplicationId is correct." });
        }
    }
}
