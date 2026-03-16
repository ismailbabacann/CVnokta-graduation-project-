using System;

namespace CleanArchitecture.Core.Features.Applications.Queries.GetCandidatePool
{
    public class CandidatePoolDto
    {
        public Guid ApplicationId { get; set; }
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
    }
}
