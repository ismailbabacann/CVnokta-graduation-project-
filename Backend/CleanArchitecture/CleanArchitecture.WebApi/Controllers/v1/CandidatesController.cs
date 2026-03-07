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
        /// POST /api/v1/Candidates
        /// Body: { "userId": "guid", "fullName": "Ad Soyad", "email": "...", "phone": "...", "location": "..." }
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateCandidateProfileCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        /// <summary>
        /// Adayın özgeçmiş dosyasını (CV) sisteme yükler.
        /// multipart/form-data formatında gönderilmelidir.
        /// POST /api/v1/Candidates/upload-cv
        /// Form: { "candidateId": "guid", "cvFile": [binary] }
        /// </summary>
        [HttpPost("upload-cv")]
        public async Task<IActionResult> UploadCv([FromForm] UploadCvCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        /// <summary>
        /// Belirtilen kullanıcıya ait aday profilini getirir (eğitim, deneyim, yetenekler, CV bilgileri).
        /// GET /api/v1/Candidates/{userId}
        /// </summary>
        [HttpGet("{userId}")]
        public async Task<IActionResult> GetProfile(string userId)
        {
            return Ok(await Mediator.Send(new GetCandidateProfileQuery { UserId = Guid.Parse(userId) }));
        }
    }
}
