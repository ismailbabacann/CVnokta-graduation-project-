using CleanArchitecture.Core.Features.Evaluations.Queries.GetCandidateRankings;
using CleanArchitecture.Core.Features.Evaluations.Queries.GetFinalScorecard;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System;

namespace CleanArchitecture.WebApi.Controllers.v1
{
    [ApiVersion("1.0")]
    public class EvaluationsController : BaseApiController
    {
        /// <summary>
        /// Belirtilen iş ilanına başvuran adayları final puanlarına göre sıralı listeler.
        /// </summary>
        /// <remarks>
        /// Dönen liste şu alanları içerir:
        /// - CandidateId, FullName, Email
        /// - CvAnalysisScore (NLP CV skoru)
        /// - GeneralTestScore (genel test skoru)
        /// - AiInterviewScore (AI mülakat skoru)
        /// - WeightedFinalScore (ağırlıklı final puan)
        /// - RankPosition (sıralama)
        /// </remarks>
        /// <param name="jobId">İş ilanı Id'si (GUID)</param>
        /// <returns>Final puanına göre sıralanmış aday listesi</returns>
        [HttpGet("rankings/{jobId}")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetRankings(Guid jobId)
        {
            return Ok(await Mediator.Send(new GetCandidateRankingsQuery { JobPostingId = jobId }));
        }

        /// <summary>
        /// Belirtilen başvurunun tüm aşamalarındaki detaylı puan kartını döner.
        /// </summary>
        /// <remarks>
        /// Dönen nesne şu alanları içerir:
        /// - ApplicationId, CandidateId
        /// - CvAnalysisResult (analiz skoru, uyuşan/eksik yetenekler)
        /// - GeneralTestResult (test adı, skoru)
        /// - AiInterviewSummary (genel mülakat skoru, güçlü/zayıf yönler)
        /// - FinalEvaluationScore (ağırlıklı final skor)
        /// </remarks>
        /// <param name="appId">Başvuru Id'si (GUID)</param>
        /// <returns>Detaylı puan kartı</returns>
        [HttpGet("scorecard/{appId}")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetScorecard(Guid appId)
        {
            return Ok(await Mediator.Send(new GetFinalScorecardQuery { ApplicationId = appId }));
        }
    }
}
