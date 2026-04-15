using System;

namespace CleanArchitecture.Core.Features.Applications.Queries.GetCandidatePool
{
    public class CandidatePoolDto
    {
        public Guid ApplicationId { get; set; }
        public Guid CandidateId { get; set; }
        public Guid JobPostingId { get; set; }
        public string CandidateDisplayId { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string AppliedPosition { get; set; }
        public DateTime ApplicationDate { get; set; }
        public int? ExperienceYears { get; set; }
        public string EducationLevel { get; set; }
        public decimal? NlpMatchScore { get; set; }
        public string Email { get; set; }
        public string Phone { get; set; }
        public string LinkedInProfile { get; set; }
        public string CvUrl { get; set; }
        public string CoverLetter { get; set; }
        public string Location { get; set; }
        /// <summary>Current automated pipeline stage for this application.</summary>
        public string CurrentPipelineStage { get; set; }
        /// <summary>Human-readable rejection reason (if stage starts with REJECTED_).</summary>
        public string RejectionReason { get; set; }
    }
}
