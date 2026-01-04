using System;

namespace CleanArchitecture.Core.Entities
{
    public class JobPosting : AuditableBaseEntity
    {
        public string JobTitle { get; set; }
        public string JobDescription { get; set; }
        public string Department { get; set; }
        public string RequiredSkills { get; set; }
        public decimal? SalaryMin { get; set; }
        public decimal? SalaryMax { get; set; }
        public string Location { get; set; }
        public int HiringManagerId { get; set; }
        public string Status { get; set; }
        public DateTime PostedDate { get; set; }
        public DateTime? ClosingDate { get; set; }
        public int TotalPositions { get; set; }
        public virtual User HiringManager { get; set; }
    }
}
