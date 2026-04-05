using CleanArchitecture.Core.Features.MarketStats.Commands.UpdateSkillStats;
using CleanArchitecture.Core.Features.MarketStats.Commands.UpdatePositionStats;
using CleanArchitecture.Core.Features.MarketStats.Commands.UpdateLocationStats;
using CleanArchitecture.Core.Features.MarketStats.Queries.GetTopMarketStats;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace CleanArchitecture.WebApi.Controllers.v1
{
    [ApiVersion("1.0")]
    public class StatisticsController : BaseApiController
    {
        /// <summary>
        /// NLP sisteminden gelen dil/yetenek listesini veritabanına upsert eder.
        /// </summary>
        /// <remarks>
        /// Gelen her dil/yetenek BÜYÜK HARFE dönüştürülerek kaydedilir.
        /// Eğer kayıt varsa kullanım sayısı (UsageCount) +1 artırılır; yoksa yeni kayıt oluşturulur.
        ///
        /// Örnek istek:
        ///
        ///     POST /api/v1/Statistics/skills
        ///     {
        ///         "skills": ["C#", "Java", "python", "c#"]
        ///     }
        ///
        /// Dönen: İşlenen eleman sayısı
        /// </remarks>
        /// <returns>İşlenen yetenek/dil sayısı</returns>
        [HttpPost("skills")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> UpdateSkills([FromBody] UpdateSkillStatsCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        /// <summary>
        /// NLP sisteminden gelen pozisyon (iş unvanı) listesini veritabanına upsert eder.
        /// </summary>
        /// <remarks>
        /// Gelen her pozisyon BÜYÜK HARFE dönüştürülerek kaydedilir.
        /// Eğer kayıt varsa kullanım sayısı (UsageCount) +1 artırılır; yoksa yeni kayıt oluşturulur.
        ///
        /// Örnek istek:
        ///
        ///     POST /api/v1/Statistics/positions
        ///     {
        ///         "positions": ["Backend Developer", "Software Engineer", "backend developer"]
        ///     }
        ///
        /// Dönen: İşlenen eleman sayısı
        /// </remarks>
        /// <returns>İşlenen pozisyon sayısı</returns>
        [HttpPost("positions")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> UpdatePositions([FromBody] UpdatePositionStatsCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        /// <summary>
        /// NLP sisteminden gelen şehir/lokasyon listesini veritabanına upsert eder.
        /// </summary>
        /// <remarks>
        /// Gelen her şehir BÜYÜK HARFE dönüştürülerek kaydedilir.
        /// Eğer kayıt varsa kullanım sayısı (UsageCount) +1 artırılır; yoksa yeni kayıt oluşturulur.
        ///
        /// Örnek istek:
        ///
        ///     POST /api/v1/Statistics/locations
        ///     {
        ///         "locations": ["Istanbul", "Ankara", "istanbul"]
        ///     }
        ///
        /// Dönen: İşlenen eleman sayısı
        /// </remarks>
        /// <returns>İşlenen lokasyon sayısı</returns>
        [HttpPost("locations")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> UpdateLocations([FromBody] UpdateLocationStatsCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        /// <summary>
        /// En çok aranan yetenek, pozisyon ve şehirlerin sıralı listesini döner (Dashboard için).
        /// </summary>
        /// <remarks>
        /// Örnek: GET /api/v1/Statistics/top?topN=10
        ///
        /// Dönen nesne:
        /// - topSkills: [{ name: "C#", usageCount: 45 }, ...]
        /// - topPositions: [{ name: "BACKEND DEVELOPER", usageCount: 30 }, ...]
        /// - topLocations: [{ name: "İSTANBUL", usageCount: 120 }, ...]
        /// </remarks>
        /// <param name="topN">Kaç adet kayıt döneceği (varsayılan: 10)</param>
        /// <returns>En çok kullanılan yetenek, pozisyon ve şehir listeleri</returns>
        [HttpGet("top")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(TopMarketStatsDto), 200)]
        public async Task<IActionResult> GetTopStats([FromQuery] int topN = 10)
        {
            return Ok(await Mediator.Send(new GetTopMarketStatsQuery { TopN = topN }));
        }
    }
}
