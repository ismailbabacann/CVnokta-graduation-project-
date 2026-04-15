using System;
using System.Threading.Tasks;
using CleanArchitecture.Core.Features.Exams.Commands.ApproveExam;
using CleanArchitecture.Core.Features.Exams.Commands.AssignExam;
using CleanArchitecture.Core.Features.Exams.Commands.GradeExam;
using CleanArchitecture.Core.Features.Exams.Commands.SubmitExam;
using CleanArchitecture.Core.Features.Exams.Queries.GetExamResults;
using CleanArchitecture.Core.Features.Exams.Queries.TakeExam;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CleanArchitecture.WebApi.Controllers.v1
{
    [ApiVersion("1.0")]
    public class ExamController : BaseApiController
    {
        /// <summary>
        /// HR tarafından AI ile oluşturulan soruları onaylar ve sınav olarak DB'ye kaydeder.
        /// </summary>
        /// <remarks>
        /// Örnek istek:
        ///
        ///     POST /api/v1/Exam/approve
        ///     {
        ///         "title": "Backend Developer Teknik Sınavı",
        ///         "jobId": "...",
        ///         "examType": "technical",
        ///         "sequenceOrder": 1,
        ///         "isMandatory": true,
        ///         "timeLimitMinutes": 45,
        ///         "questions": [ { "questionText": "...", "questionType": "multiple_choice", ... } ]
        ///     }
        ///
        /// Dönen: examId, status, questionCount, totalPoints
        /// </remarks>
        /// <returns>Oluşturulan sınavın detayları</returns>
        [HttpPost("approve")]
        [ProducesResponseType(typeof(ApproveExamResponse), 201)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> Approve([FromBody] ApproveExamCommand command)
        {
            var result = await Mediator.Send(command);
            return StatusCode(201, result);
        }

        /// <summary>
        /// Seçilen adaylara, seçilen sınavları toplu olarak atar. Her (aday × sınav) için ayrı token üretir.
        /// </summary>
        /// <remarks>
        /// Örnek istek:
        ///
        ///     POST /api/v1/Exam/assign
        ///     {
        ///         "jobId": "...",
        ///         "candidateIds": ["...", "..."],
        ///         "examIds": ["...", "..."],
        ///         "expiresInHours": 168,
        ///         "sendNotification": true
        ///     }
        ///
        /// Dönen: batchId, assignments[], skipped[]
        /// </remarks>
        /// <returns>Oluşturulan atamaların listesi</returns>
        [HttpPost("assign")]
        [ProducesResponseType(typeof(AssignExamResponse), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> Assign([FromBody] AssignExamCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        /// <summary>
        /// Aday, kendisine atanan sınavı token ile açar. Sorular doğru cevap olmadan döner.
        /// </summary>
        /// <param name="token">Sınavın benzersiz erişim tokeni</param>
        /// <returns>Sınav bilgileri ve soruları</returns>
        [HttpGet("take/{token}")]
        [ProducesResponseType(typeof(TakeExamResponse), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        [AllowAnonymous]
        public async Task<IActionResult> Take(string token)
        {
            return Ok(await Mediator.Send(new TakeExamQuery { Token = token }));
        }

        /// <summary>
        /// Aday, belirtilen token'ın sınavı için cevaplarını gönderir. MC/TF sorular otomatik değerlendirilir.
        /// </summary>
        /// <param name="token">Sınavın benzersiz erişim tokeni</param>
        /// <param name="command">Cevaplar listesi</param>
        /// <returns>Otomatik değerlendirme sonucu ve kalan sınav sayısı</returns>
        [HttpPost("submit/{token}")]
        [ProducesResponseType(typeof(SubmitExamResponse), 200)]
        [ProducesResponseType(400)]
        [AllowAnonymous]
        public async Task<IActionResult> Submit(string token, [FromBody] SubmitExamCommand command)
        {
            command.Token = token;
            return Ok(await Mediator.Send(command));
        }

        /// <summary>
        /// HR, açık uçlu soruları manuel olarak puanlar.
        /// </summary>
        /// <remarks>
        /// Örnek istek:
        ///
        ///     PATCH /api/v1/Exam/grade
        ///     {
        ///         "grades": [
        ///             { "answerId": "...", "pointsEarned": 16, "isCorrect": true, "feedback": "İyi açıklama." }
        ///         ]
        ///     }
        /// </remarks>
        /// <returns>Puanlanan cevap sayısı ve etkilenen atama ID'leri</returns>
        [HttpPatch("grade")]
        [ProducesResponseType(typeof(GradeExamResponse), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> Grade([FromBody] GradeExamCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        /// <summary>
        /// HR, bir iş ilanındaki tüm aday × sınav sonuçlarını matris formatında görür.
        /// </summary>
        /// <param name="jobId">İş ilanı ID'si</param>
        /// <param name="examId">Opsiyonel: Belirli bir sınavı filtrele</param>
        /// <param name="status">Opsiyonel: submitted | pending | expired</param>
        /// <param name="sortBy">Opsiyonel: total_score | submitted_at</param>
        /// <returns>Aday × sınav sonuç matrisi</returns>
        [HttpGet("results/{jobId}")]
        [ProducesResponseType(typeof(ExamResultMatrixResponse), 200)]
        public async Task<IActionResult> Results(
            Guid jobId,
            [FromQuery] Guid? examId = null,
            [FromQuery] string status = null,
            [FromQuery] string sortBy = null)
        {
            var query = new GetExamResultsQuery
            {
                JobId = jobId,
                ExamId = examId,
                Status = status,
                SortBy = sortBy
            };
            return Ok(await Mediator.Send(query));
        }
    }
}
