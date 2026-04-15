using CleanArchitecture.Core.Features.Applications.Queries.GetMyApplications;
using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Core.Entities;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace CleanArchitecture.WebApi.Controllers.v1
{
    [ApiVersion("1.0")]
    public class PipelineController : BaseApiController
    {
        private readonly IGenericRepositoryAsync<JobApplication> _applicationRepo;
        private readonly IGenericRepositoryAsync<JobPosting> _jobPostingRepo;

        public PipelineController(
            IGenericRepositoryAsync<JobApplication> applicationRepo,
            IGenericRepositoryAsync<JobPosting> jobPostingRepo)
        {
            _applicationRepo = applicationRepo;
            _jobPostingRepo  = jobPostingRepo;
        }

        /// <summary>
        /// Pipeline stage summary for a job posting.
        /// GET /api/v1/Pipeline/{jobId}/summary
        /// </summary>
        [HttpGet("{jobId}/summary")]
        [Authorize]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetSummary(Guid jobId)
        {
            var job = await _jobPostingRepo.GetByIdAsync(jobId);
            if (job == null) return NotFound();

            var allApps = await _applicationRepo.GetAllAsync();
            var apps = allApps.Where(a => a.JobPostingId == jobId).ToList();

            return Ok(new
            {
                jobId,
                passThreshold     = job.PipelinePassThreshold,
                nlpReview         = apps.Count(a => a.CurrentPipelineStage == "NLP_REVIEW"),
                skillsTestPending = apps.Count(a => a.CurrentPipelineStage == "SKILLS_TEST_PENDING"),
                englishTestPending= apps.Count(a => a.CurrentPipelineStage == "ENGLISH_TEST_PENDING"),
                aiInterviewPending= apps.Count(a => a.CurrentPipelineStage == "AI_INTERVIEW_PENDING"),
                completed         = apps.Count(a => a.CurrentPipelineStage == "COMPLETED"),
                rejected          = apps.Count(a => (a.CurrentPipelineStage ?? "").StartsWith("REJECTED")),
                total             = apps.Count
            });
        }

        /// <summary>
        /// Update pass threshold for a job posting's pipeline.
        /// PUT /api/v1/Pipeline/{jobId}/threshold
        /// </summary>
        [HttpPut("{jobId}/threshold")]
        [Authorize]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> UpdateThreshold(Guid jobId, [FromBody] UpdateThresholdRequest request)
        {
            if (request.PassThreshold < 1 || request.PassThreshold > 100)
                return BadRequest(new { message = "Eşik değeri 1-100 arasında olmalıdır." });

            var job = await _jobPostingRepo.GetByIdAsync(jobId);
            if (job == null) return NotFound();

            job.PipelinePassThreshold = request.PassThreshold;
            await _jobPostingRepo.UpdateAsync(job);

            return Ok(new { success = true, passThreshold = job.PipelinePassThreshold });
        }
    }

    public class UpdateThresholdRequest
    {
        public int PassThreshold { get; set; }
    }
}
