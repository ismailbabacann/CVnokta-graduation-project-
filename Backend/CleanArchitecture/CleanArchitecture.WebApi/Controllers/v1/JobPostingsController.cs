using CleanArchitecture.Core.Features.JobPostings.Commands.CreateJobPosting;
using CleanArchitecture.Core.Features.JobPostings.Commands.UpdateJobPostingStatus;
using CleanArchitecture.Core.Features.JobPostings.Queries.GetActiveJobPostings;
using CleanArchitecture.Core.Features.JobPostings.Queries.GetJobPostingsWithStats;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System;

namespace CleanArchitecture.WebApi.Controllers.v1
{
    [ApiVersion("1.0")]
    public class JobPostingsController : BaseApiController
    {
        [HttpPost]
        public async Task<IActionResult> Create(CreateJobPostingCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(Guid id, UpdateJobPostingStatusCommand command)
        {
            if (id != command.Id) return BadRequest();
            return Ok(await Mediator.Send(command));
        }

        [HttpGet("active")]
        public async Task<IActionResult> GetActive()
        {
            return Ok(await Mediator.Send(new GetActiveJobPostingsQuery()));
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats([FromQuery] int hiringManagerId)
        {
            return Ok(await Mediator.Send(new GetJobPostingsWithStatsQuery { HiringManagerId = hiringManagerId }));
        }
    }
}
