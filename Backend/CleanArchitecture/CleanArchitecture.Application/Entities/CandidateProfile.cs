using System;

namespace CleanArchitecture.Core.Entities
{
    public class CandidateProfile : AuditableBaseEntity
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public string Phone { get; set; }
        public string Location { get; set; }
        public string Summary { get; set; }
        public int? ExperienceYears { get; set; }
        public string EducationLevel { get; set; }
        public virtual User User { get; set; }
    }
}
