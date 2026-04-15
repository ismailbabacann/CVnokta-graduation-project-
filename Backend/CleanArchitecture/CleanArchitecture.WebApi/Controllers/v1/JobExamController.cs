using System;
using System.Threading.Tasks;
using CleanArchitecture.Core.Features.Exams.Queries.GetJobExams;
using Microsoft.AspNetCore.Mvc;

namespace CleanArchitecture.WebApi.Controllers.v1
{
    [ApiVersion("1.0")]
    public class JobExamController : BaseApiController
    {
        /// <summary>
        /// Bir iş ilanına bağlı tüm onaylı sınavları listeler.
        /// </summary>
        /// <remarks>
        /// Yanıt, her sınav için başlık, tür, soru sayısı, toplam puan ve durum bilgilerini içerir.
        ///
        /// Örnek istek:
        ///
        ///     GET /api/v1/JobExam/{jobId}/exams
        ///
        /// </remarks>
        /// <param name="jobId">İş ilanı ID'si (GUID)</param>
        /// <returns>Sınav listesi ve meta verileri</returns>
        [HttpGet("{jobId}/exams")]
        [ProducesResponseType(typeof(GetJobExamsResponse), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetExamsForJob(Guid jobId)
        {
            return Ok(await Mediator.Send(new GetJobExamsQuery { JobId = jobId }));
        }
    }
}
