using System;
using System.Threading.Tasks;
using CleanArchitecture.Core.Features.Exams.Queries.GetCandidateDashboard;
using Microsoft.AspNetCore.Mvc;

namespace CleanArchitecture.WebApi.Controllers.v1
{
    [ApiVersion("1.0")]
    public class CandidateDashboardController : BaseApiController
    {
        /// <summary>
        /// Adayın kendisine atanan tüm sınavları durumları ile birlikte döner.
        /// </summary>
        /// <remarks>
        /// Her atama için sınav adı, iş ilanı, durum, puan ve son tarih bilgileri döner.
        ///
        /// Örnek istek:
        ///
        ///     GET /api/v1/CandidateDashboard/{candidateId}
        ///
        /// </remarks>
        /// <param name="candidateId">Aday profil ID'si (GUID)</param>
        /// <returns>Aday sınav gösterge paneli</returns>
        [HttpGet("{candidateId}")]
        [ProducesResponseType(typeof(CandidateDashboardResponse), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetDashboard(Guid candidateId)
        {
            return Ok(await Mediator.Send(new GetCandidateDashboardQuery { CandidateId = candidateId }));
        }
    }
}
