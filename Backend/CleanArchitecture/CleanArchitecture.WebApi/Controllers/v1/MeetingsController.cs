using CleanArchitecture.Core.Features.Meetings.Commands.SendMeetingInvitation;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace CleanArchitecture.WebApi.Controllers.v1
{
    [ApiVersion("1.0")]
    public class MeetingsController : BaseApiController
    {
        [HttpPost("invite")]
        public async Task<IActionResult> Invite(SendMeetingInvitationCommand command)
        {
            return Ok(await Mediator.Send(command));
        }
    }
}
