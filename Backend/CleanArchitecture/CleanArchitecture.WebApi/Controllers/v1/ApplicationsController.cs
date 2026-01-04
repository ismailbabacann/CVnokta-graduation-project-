using CleanArchitecture.Core.Features.Applications.Commands.SubmitJobApplication;
using CleanArchitecture.Core.Features.Applications.Commands.UpdateApplicationStage;
using CleanArchitecture.Core.Features.Applications.Queries.GetApplicationDetail;
using CleanArchitecture.Core.Features.Applications.Queries.GetApplicationsByJobId;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System;

namespace CleanArchitecture.WebApi.Controllers.v1
{
    [ApiVersion("1.0")]
    public class ApplicationsController : BaseApiController
    {
        [HttpPost]
        public async Task<IActionResult> Submit(SubmitJobApplicationCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        [HttpPut("{id}/stage")]
        public async Task<IActionResult> UpdateStage(Guid id, UpdateApplicationStageCommand command)
        {
            if (id != command.ApplicationId) return BadRequest();
            return Ok(await Mediator.Send(command));
        }

        [HttpGet("job/{jobId}")]
        public async Task<IActionResult> GetByJob(Guid jobId)
        {
            return Ok(await Mediator.Send(new GetApplicationsByJobIdQuery { JobPostingId = jobId }));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetDetail(Guid id)
        {
            return Ok(await Mediator.Send(new GetApplicationDetailQuery { ApplicationId = id }));
        }
    }
}
