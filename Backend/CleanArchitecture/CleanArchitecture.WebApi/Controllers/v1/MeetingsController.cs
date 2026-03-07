using CleanArchitecture.Core.Features.Meetings.Commands.SendMeetingInvitation;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace CleanArchitecture.WebApi.Controllers.v1
{
    [ApiVersion("1.0")]
    public class MeetingsController : BaseApiController
    {
        /// <summary>
        /// Belirtilen adaya toplantı/mülakat daveti gönderir.
        /// MeetingInvitation kaydı oluşturulur; e-posta gönderimi için tetikleyici görevi görür.
        /// POST /api/v1/Meetings/invite
        /// Body: { "applicationId": "guid", "jobPostingId": "guid", "candidateId": "guid",
        ///         "meetingTitle": "Final Mülakat", "scheduledDate": "2024-04-01T10:00:00Z",
        ///         "meetingLink": "https://meet.google.com/...", "meetingType": "FINAL_INTERVIEW" }
        /// </summary>
        [HttpPost("invite")]
        public async Task<IActionResult> Invite([FromBody] SendMeetingInvitationCommand command)
        {
            return Ok(await Mediator.Send(command));
        }
    }
}
