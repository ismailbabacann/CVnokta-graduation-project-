using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Infrastructure.Contexts;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace CleanArchitecture.Infrastructure.Seeds
{
    public static class DefaultApplicationData
    {
        public static async Task SeedAsync(ApplicationDbContext context)
        {
            if (!context.Users.Any())
            {
                // 1. Sync Identity Users to Domain Users
                // Basic User (Recruiter/Hiring Manager for demo)
                var recruiterId = Guid.Parse("40c5f59c-8594-47b1-912f-917537b980e1"); 
                var recruiterUser = new User
                {
                    Id = recruiterId,
                    Email = "basicuser@gmail.com",
                    FullName = "John Doe",
                    UserType = "Employer",
                    IsActive = true,
                    PasswordHash = "hashed_pw", // Not used for auth, just required field
                    CreatedBy = "System",
                    Created = DateTime.UtcNow
                };
                await context.Users.AddAsync(recruiterUser);

                // SuperAdmin (Candidate for demo - usually admin is admin, but let's separate concerns later)
                // Let's create a NEW specific Candidate User for better demo isolation, or just use SuperAdmin as candidate?
                // Better: Create a separate Candidate User in Identity if not exists? 
                // For simplicity now, let's use SuperAdmin as a Candidate as well for demo purposes.
                var candidateId = Guid.Parse("64f1e948-4e89-4829-87c2-9a3d1bcf5a8d");
                var candidateUser = new User
                {
                    Id = candidateId,
                    Email = "superadmin@gmail.com",
                    FullName = "Mukesh Murugan",
                    UserType = "Candidate",
                    IsActive = true,
                    PasswordHash = "hashed_pw",
                    CreatedBy = "System",
                    Created = DateTime.UtcNow
                };
                await context.Users.AddAsync(candidateUser);
                await context.SaveChangesAsync();

                // 2. Create Candidate Profile
                var candidateProfile = new CandidateProfile
                {
                    Id = Guid.NewGuid(),
                    UserId = candidateId,
                    FullName = "Mukesh Murugan",
                    Email = "superadmin@gmail.com",
                    Phone = "+905551234567",
                    Location = "Istanbul, Turkey",
                    Summary = "Senior .NET Developer with 10 years of experience.",
                    ExperienceYears = 10,
                    EducationLevel = "Master's Degree",
                    CreatedBy = "System",
                    Created = DateTime.UtcNow
                };
                await context.CandidateProfiles.AddAsync(candidateProfile);

                // 3. Create Job Posting
                var jobPosting = new JobPosting
                {
                    Id = Guid.NewGuid(),
                    JobTitle = "Senior Backend Developer",
                    JobDescription = "We are looking for an experienced .NET Developer...",
                    Department = "Engineering",
                    RequiredSkills = ".NET Core, C#, SQL, Azure, CQRS",
                    SalaryMin = 50000,
                    SalaryMax = 80000,
                    Location = "Remote / Istanbul",
                    HiringManagerId = recruiterId, // Guid
                    Status = "Active",
                    PostedDate = DateTime.UtcNow,
                    ClosingDate = DateTime.UtcNow.AddMonths(1),
                    TotalPositions = 1,
                    CreatedBy = recruiterId.ToString(),
                    Created = DateTime.UtcNow
                };
                await context.JobPostings.AddAsync(jobPosting);
                await context.SaveChangesAsync();

                // 4. Create Job Application
                var application = new JobApplication
                {
                    Id = Guid.NewGuid(),
                    JobPostingId = jobPosting.Id,
                    CandidateId = candidateProfile.Id,
                    CvId = null, // Can add CV upload logic if needed
                    CoverLetter = "I am highly interested in this position.",
                    ApplicationStatus = "Received",
                    AppliedAt = DateTime.UtcNow,
                    CreatedBy = candidateId.ToString(),
                    Created = DateTime.UtcNow
                };
                await context.JobApplications.AddAsync(application);

                // 5. Create Initial Stage
                var stage = new ApplicationStage
                {
                    Id = Guid.NewGuid(),
                    ApplicationId = application.Id,
                    JobPostingId = jobPosting.Id,
                    StageType = "Applied",
                    StageStatus = "Completed",
                    StartedAt = DateTime.UtcNow,
                    CompletedAt = DateTime.UtcNow,
                    Notes = "Application received.",
                    CreatedBy = "System",
                    Created = DateTime.UtcNow
                };
                await context.ApplicationStages.AddAsync(stage);
                
                await context.SaveChangesAsync();
            }
        }
    }
}
