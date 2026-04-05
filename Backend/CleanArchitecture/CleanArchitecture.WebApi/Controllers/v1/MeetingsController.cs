using CleanArchitecture.Core.Features.Meetings.Commands.SendMeetingInvitation;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace CleanArchitecture.WebApi.Controllers.v1
{
    [ApiVersion("1.0")]
    public class MeetingsController : BaseApiController
    {
        /// <summary>
        /// Belirtilen adaya toplantı/final mülakat daveti gönderir.
        /// </summary>
        /// <remarks>
        /// MeetingInvitation kaydı oluşturulur; e-posta gönderimi için tetikleyici görevi görür.
        ///
        /// Örnek istek:
        ///
        ///     POST /api/v1/Meetings/invite
        ///     {
        ///         "applicationId": "3fa85f64-...",
        ///         "jobPostingId": "3fa85f64-...",
        ///         "candidateId": "3fa85f64-...",
        ///         "meetingTitle": "Final Mülakat - Backend Developer",
        ///         "scheduledDate": "2024-04-01T10:00:00Z",
        ///         "meetingLink": "https://meet.google.com/xxx-yyyy-zzz",
        ///         "meetingType": "FINAL_INTERVIEW"
        ///     }
        ///
        /// Dönen: Oluşturulan MeetingInvitation Id'si
        /// </remarks>
        /// <returns>Oluşturulan davet kaydının Id'si</returns>
        [HttpPost("invite")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> Invite([FromBody] SendMeetingInvitationCommand command)
        {
            return Ok(await Mediator.Send(command));
        }
    }
}
