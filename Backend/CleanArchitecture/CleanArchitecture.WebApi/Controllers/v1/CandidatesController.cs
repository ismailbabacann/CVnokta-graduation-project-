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
        [HttpPost]
        public async Task<IActionResult> Create(CreateCandidateProfileCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        [HttpPost("upload-cv")]
        public async Task<IActionResult> UploadCv([FromForm] UploadCvCommand command)
        {
            return Ok(await Mediator.Send(command));
        }

        [HttpGet("{userId}")]
        public async Task<IActionResult> GetProfile(string userId)
        {
            return Ok(await Mediator.Send(new GetCandidateProfileQuery { UserId = Guid.Parse(userId) }));
        }
    }
}
