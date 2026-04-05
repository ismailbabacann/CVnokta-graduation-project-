using CleanArchitecture.Core.Features.Candidates.Commands.CreateCandidateProfile;
using CleanArchitecture.Core.Features.Candidates.Commands.UploadCv;
using CleanArchitecture.Core.Features.Candidates.Queries.GetCandidateProfile;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System;

namespace CleanArchitecture.WebApi.Controllers.v1
{
    [ApiVersion("1.0")]
    public class CandidatesController : BaseApiController
    {
        /// <summary>
        /// Yeni aday profili oluşturur (kayıt sırasında otomatik çağrılır).
        /// </summary>
        /// <remarks>
        /// Örnek istek:
        ///
        ///     POST /api/v1/Candidates
        ///     {
        ///         "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        ///         "fullName": "Ahmet Yılmaz",
        ///         "email": "ahmet@ornek.com",
        ///         "phone": "05001234567",
        ///         "location": "İstanbul"
        ///     }
        /// </remarks>
        /// <returns>Oluşturulan aday profilinin Id'si</returns>
        [HttpPost]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> Create([FromBody] CreateCandidateProfileCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        /// <summary>
        /// Adayın özgeçmiş dosyasını (CV) sisteme yükler. multipart/form-data formatında gönderilmelidir.
        /// </summary>
        /// <remarks>
        /// Form alanları:
        /// - candidateId: GUID
        /// - cvFile: binary (.pdf veya .docx)
        /// </remarks>
        /// <returns>Yüklenen CV'nin kayıt bilgileri (dosya adı, yol, Id)</returns>
        [HttpPost("upload-cv")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadCv([FromForm] UploadCvCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        /// <summary>
        /// Belirtilen kullanıcıya ait aday profilini getirir (eğitim, deneyim, yetenekler, CV bilgileri).
        /// </summary>
        /// <param name="userId">Kullanıcı Id'si (GUID)</param>
        /// <returns>Aday profil detay bilgisi</returns>
        [HttpGet("{userId}")]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetProfile(string userId)
        {
            return Ok(await Mediator.Send(new GetCandidateProfileQuery { UserId = Guid.Parse(userId) }));
        }
    }
}
