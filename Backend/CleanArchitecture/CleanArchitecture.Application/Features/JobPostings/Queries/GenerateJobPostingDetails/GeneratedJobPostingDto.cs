using System;
using System.Collections.Generic;
using System.Text;

namespace CleanArchitecture.Application.Features.JobPostings.Queries.GenerateJobPostingDetails
{
    public class GeneratedJobPostingDto
    {
        public string JobTitle { get; set; }
        public string Department { get; set; }
        public string Location { get; set; }
        
        /// <summary>FullTime / PartTime / Contract / Internship</summary>
        public string WorkType { get; set; }
        
        /// <summary>Remote / Hybrid / OnSite</summary>
        public string WorkModel { get; set; }
        
        public string AboutCompany { get; set; }
        public string AboutRole { get; set; }
        public string Responsibilities { get; set; }
        public string RequiredQualifications { get; set; }
        public string RequiredSkills { get; set; }
        
        public decimal? SalaryMin { get; set; }
        public decimal? SalaryMax { get; set; }
        public int TotalPositions { get; set; }
        
        public string Benefits { get; set; }
    }
}
