using CleanArchitecture.Core.Features.Interviews.Commands.CompleteAiInterview;
using CleanArchitecture.Core.Features.Interviews.Commands.StartAiInterview;
using CleanArchitecture.Core.Features.Interviews.Commands.SubmitAiInterviewAnswer;
using CleanArchitecture.Core.Features.Interviews.Queries.GetAiInterviewSummary;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System;

namespace CleanArchitecture.WebApi.Controllers.v1
{
    [ApiVersion("1.0")]
    public class InterviewsController : BaseApiController
    {
        [HttpPost("start")]
        public async Task<IActionResult> Start(StartAiInterviewCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        [HttpPost("submit-answer")]
        public async Task<IActionResult> SubmitAnswer(SubmitAiInterviewAnswerCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        [HttpPost("complete")]
        public async Task<IActionResult> Complete(CompleteAiInterviewCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        [HttpGet("{sessionId}/summary")]
        public async Task<IActionResult> GetSummary(Guid sessionId)
        {
            return Ok(await Mediator.Send(new GetAiInterviewSummaryQuery { SessionId = sessionId }));
        }
    }
}
