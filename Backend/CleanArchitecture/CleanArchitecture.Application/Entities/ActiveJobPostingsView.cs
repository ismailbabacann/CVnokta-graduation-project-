using System;

namespace CleanArchitecture.Core.Entities
{
    public class ActiveJobPostingsView : BaseEntity
    {
        public int JobPostingId { get; set; }
        public string JobTitle { get; set; }
        public string Department { get; set; }
        public DateTime? PostingDate { get; set; }
        public DateTime? ClosingDate { get; set; }
        public int? TotalApplications { get; set; }
        public int? ScreeningPending { get; set; }
        public int? InEvaluation { get; set; }
        public int? ApprovedCandidates { get; set; }
        public int? RejectedCandidates { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
