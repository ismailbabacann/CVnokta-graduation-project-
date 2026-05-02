using CleanArchitecture.Core.Features.Feedback.Commands.SaveFeedback;
using CleanArchitecture.Core.Features.Feedback.Queries.GetFeedback;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CleanArchitecture.WebApi.Controllers.v1
{
    [ApiVersion("1.0")]
    public class FeedbackController : BaseApiController
    {
        /// <summary>
        /// Belirtilen başvurunun tüm aşamalarındaki geri bildirimlerini döner.
        /// </summary>
        /// <param name="applicationId">Başvuru Id'si (GUID)</param>
        /// <param name="perspective">Opsiyonel: "hr" veya "candidate" filtresi. Boş bırakılırsa her iki perspektif döner.</param>
        /// <returns>Aşama bazlı geri bildirimler (güçlü yönler, zayıf yönler, genel değerlendirme)</returns>
        [HttpGet("{applicationId}")]
        [ProducesResponseType(typeof(ApplicationFeedbackResponse), 200)]
        public async Task<IActionResult> GetFeedback(Guid applicationId, [FromQuery] string perspective = null)
        {
            var result = await Mediator.Send(new GetFeedbackQuery
            {
                ApplicationId = applicationId,
                Perspective = perspective
            });
            return Ok(result);
        }

        /// <summary>
        /// AI-NLP servisinden gelen geri bildirimi kaydeder.
        /// Her aşama için IK ve Aday perspektifli geri bildirim içerir.
        /// </summary>
        [HttpPost("save")]
        [ProducesResponseType(typeof(bool), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> SaveFeedback([FromBody] SaveFeedbackRequest request)
        {
            if (request == null || request.ApplicationId == Guid.Empty)
                return BadRequest("ApplicationId is required.");

            var result = await Mediator.Send(new SaveFeedbackCommand
            {
                ApplicationId = request.ApplicationId,
                StageType = request.StageType,
                HrStrengths = request.HrStrengths ?? new List<string>(),
                HrWeaknesses = request.HrWeaknesses ?? new List<string>(),
                HrOverall = request.HrOverall ?? "",
                CandidateStrengths = request.CandidateStrengths ?? new List<string>(),
                CandidateWeaknesses = request.CandidateWeaknesses ?? new List<string>(),
                CandidateOverall = request.CandidateOverall ?? "",
            });

            return Ok(result);
        }
    }

    /// <summary>
    /// DTO for save-feedback endpoint — matches camelCase JSON from AI-NLP.
    /// </summary>
    public class SaveFeedbackRequest
    {
        public Guid ApplicationId { get; set; }
        public string StageType { get; set; }
        public List<string> HrStrengths { get; set; }
        public List<string> HrWeaknesses { get; set; }
        public string HrOverall { get; set; }
        public List<string> CandidateStrengths { get; set; }
        public List<string> CandidateWeaknesses { get; set; }
        public string CandidateOverall { get; set; }
    }
}
