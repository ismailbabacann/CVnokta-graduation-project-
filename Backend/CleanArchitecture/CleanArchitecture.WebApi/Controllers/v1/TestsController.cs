using CleanArchitecture.Core.Features.Tests.Commands.SaveTestResult;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace CleanArchitecture.WebApi.Controllers.v1
{
    [ApiVersion("1.0")]
    public class TestsController : BaseApiController
    {
        [HttpPost("save-result")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(object), 200)]
        public async Task<IActionResult> SaveResult([FromBody] SaveTestResultCommand command)
        {
            return Ok(await Mediator.Send(command));
        }
    }
}
