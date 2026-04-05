using CleanArchitecture.Core.Features.Evaluations.Commands.SaveCvAnalysis;
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
        /// NLP servisi tarafından CV skorlarını kaydetmek üzere çağrılır.
        /// </summary>
        /// <remarks>
        /// Bu endpoint, harici NLP/AI sistemleri tarafından çağrılır. Başvuruya ait CV analiz
        /// sonuçlarını (skor, uyuşan/eksik yetenekler, genel değerlendirme) veritabanına kaydeder.
        ///
        /// Örnek istek:
        ///
        ///     POST /api/v1/cvanalysis/save-score
        ///     {
        ///         "applicationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        ///         "analysisScore": 85.5,
        ///         "matchingSkills": "C#, .NET, SQL",
        ///         "missingSkills": "Docker, Kubernetes",
        ///         "experienceMatchScore": 90.0,
        ///         "educationMatchScore": 80.0,
        ///         "overallAssessment": "Güçlü bir aday, teknik açıdan uygun."
        ///     }
        ///
        /// Örnek başarılı yanıt:
        ///
        ///     { "message": "Score updated successfully." }
        ///
        /// Örnek hata yanıtı:
        ///
        ///     { "message": "Operation failed. Ensure ApplicationId is correct." }
        /// </remarks>
        /// <param name="command">CV analiz verileri (applicationId, skor, yetenekler, değerlendirme)</param>
        /// <returns>İşlem başarı mesajı</returns>
        [HttpPost("save-score")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(typeof(object), 400)]
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
