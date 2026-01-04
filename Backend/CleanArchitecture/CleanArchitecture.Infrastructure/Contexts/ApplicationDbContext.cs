using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Core.Entities;
using CleanArchitecture.Infrastructure.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Infrastructure.Contexts
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        private readonly IDateTimeService _dateTime;
        private readonly IAuthenticatedUserService _authenticatedUser;

        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options, IDateTimeService dateTime, IAuthenticatedUserService authenticatedUser) 
            : base(options)
        {
            ChangeTracker.QueryTrackingBehavior = QueryTrackingBehavior.NoTracking;
            _dateTime = dateTime;
            _authenticatedUser = authenticatedUser;
        }

        // Core entities
        public DbSet<User> Users { get; set; }
        public DbSet<CandidateProfile> CandidateProfiles { get; set; }
        public DbSet<JobPosting> JobPostings { get; set; }
        public DbSet<CvUpload> CvUploads { get; set; }
        public DbSet<JobApplication> JobApplications { get; set; }
        public DbSet<ApplicationStage> ApplicationStages { get; set; }
        public DbSet<GeneralTestResult> GeneralTestResults { get; set; }
        public DbSet<CvAnalysisResult> CvAnalysisResults { get; set; }
        public DbSet<AiInterviewSession> AiInterviewSessions { get; set; }
        public DbSet<AiInterviewQa> AiInterviewQAs { get; set; }
        public DbSet<AiInterviewSummary> AiInterviewSummaries { get; set; }
        public DbSet<FinalEvaluationScore> FinalEvaluationScores { get; set; }
        public DbSet<MeetingInvitation> MeetingInvitations { get; set; }
        public DbSet<EventLog> EventLogs { get; set; }

        // Read Models
        public DbSet<CandidateRankingView> CandidateRankingViews { get; set; }
        public DbSet<ActiveJobPostingsView> ActiveJobPostingsViews { get; set; }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = new CancellationToken())
        {
            foreach (var entry in ChangeTracker.Entries<AuditableBaseEntity>())
            {
                switch (entry.State)
                {
                    case EntityState.Added:
                        entry.Entity.Created = _dateTime.NowUtc;
                        entry.Entity.CreatedBy = _authenticatedUser.UserId;
                        break;
                    case EntityState.Modified:
                        entry.Entity.LastModified = _dateTime.NowUtc;
                        entry.Entity.LastModifiedBy = _authenticatedUser.UserId;
                        break;
                }
            }
            return base.SaveChangesAsync(cancellationToken);
        }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Decimal precision - 18,2 for financial values
            foreach (var property in builder.Model.GetEntityTypes()
                .SelectMany(t => t.GetProperties())
                .Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?)))
            {
                property.SetColumnType("decimal(18,2)");
            }

            // User Configuration
            builder.Entity<User>()
                .HasKey(u => u.Id);
            builder.Entity<User>()
                .Property(u => u.Email).IsRequired().HasMaxLength(255);
            builder.Entity<User>()
                .Property(u => u.PasswordHash).IsRequired().HasMaxLength(255);
            builder.Entity<User>()
                .Property(u => u.UserType).IsRequired().HasMaxLength(20);
            builder.Entity<User>()
                .Property(u => u.FullName).IsRequired().HasMaxLength(255);
            builder.Entity<User>()
                .Property(u => u.Phone).HasMaxLength(20);
            builder.Entity<User>()
                .HasIndex(u => u.Email).IsUnique();
            builder.Entity<User>()
                .HasIndex(u => u.UserType);

            // CandidateProfile Configuration
            builder.Entity<CandidateProfile>()
                .HasKey(cp => cp.Id);
            builder.Entity<CandidateProfile>()
                .Property(cp => cp.FullName).IsRequired().HasMaxLength(255);
            builder.Entity<CandidateProfile>()
                .Property(cp => cp.Email).IsRequired().HasMaxLength(255);
            builder.Entity<CandidateProfile>()
                .Property(cp => cp.Phone).HasMaxLength(20);
            builder.Entity<CandidateProfile>()
                .Property(cp => cp.Location).HasMaxLength(255);
            builder.Entity<CandidateProfile>()
                .Property(cp => cp.EducationLevel).HasMaxLength(100);
            builder.Entity<CandidateProfile>()
                .HasOne(cp => cp.User)
                .WithMany()
                .HasForeignKey(cp => cp.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.Entity<CandidateProfile>()
                .HasIndex(cp => cp.UserId).IsUnique();

            // JobPosting Configuration
            builder.Entity<JobPosting>()
                .HasKey(jp => jp.Id);
            builder.Entity<JobPosting>()
                .Property(jp => jp.JobTitle).IsRequired().HasMaxLength(255);
            builder.Entity<JobPosting>()
                .Property(jp => jp.JobDescription).IsRequired();
            builder.Entity<JobPosting>()
                .Property(jp => jp.Department).IsRequired().HasMaxLength(100);
            builder.Entity<JobPosting>()
                .Property(jp => jp.Location).HasMaxLength(255);
            builder.Entity<JobPosting>()
                .Property(jp => jp.Status).IsRequired().HasMaxLength(20).HasDefaultValue("DRAFT");
            builder.Entity<JobPosting>()
                .HasOne(jp => jp.HiringManager)
                .WithMany()
                .HasForeignKey(jp => jp.HiringManagerId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.Entity<JobPosting>()
                .HasIndex(jp => jp.Status);
            builder.Entity<JobPosting>()
                .HasIndex(jp => jp.PostedDate);
            builder.Entity<JobPosting>()
                .HasIndex(jp => jp.HiringManagerId);

            // CvUpload Configuration
            builder.Entity<CvUpload>()
                .HasKey(cu => cu.Id);
            builder.Entity<CvUpload>()
                .Property(cu => cu.FileName).IsRequired().HasMaxLength(255);
            builder.Entity<CvUpload>()
                .Property(cu => cu.FilePath).IsRequired().HasMaxLength(500);
            builder.Entity<CvUpload>()
                .Property(cu => cu.MimeType).HasMaxLength(50);
            builder.Entity<CvUpload>()
                .HasOne(cu => cu.CandidateProfile)
                .WithMany()
                .HasForeignKey(cu => cu.CandidateId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.Entity<CvUpload>()
                .HasIndex(cu => cu.CandidateId);
            builder.Entity<CvUpload>()
                .HasIndex(cu => cu.IsCurrent);

            // JobApplication Configuration
            builder.Entity<JobApplication>()
                .HasKey(ja => ja.Id);
            builder.Entity<JobApplication>()
                .Property(ja => ja.ApplicationStatus).IsRequired().HasMaxLength(30).HasDefaultValue("SUBMITTED");
            builder.Entity<JobApplication>()
                .HasOne(ja => ja.JobPosting)
                .WithMany()
                .HasForeignKey(ja => ja.JobPostingId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.Entity<JobApplication>()
                .HasOne(ja => ja.CandidateProfile)
                .WithMany()
                .HasForeignKey(ja => ja.CandidateId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.Entity<JobApplication>()
                .HasOne(ja => ja.CvUpload)
                .WithMany()
                .HasForeignKey(ja => ja.CvId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
            builder.Entity<JobApplication>()
                .HasIndex(ja => ja.JobPostingId);
            builder.Entity<JobApplication>()
                .HasIndex(ja => ja.CandidateId);
            builder.Entity<JobApplication>()
                .HasIndex(ja => ja.ApplicationStatus);
            builder.Entity<JobApplication>()
                .HasIndex(ja => ja.AppliedAt);
            builder.Entity<JobApplication>()
                .HasAlternateKey(ja => new { ja.JobPostingId, ja.CandidateId });

            // ApplicationStage Configuration
            builder.Entity<ApplicationStage>()
                .HasKey(ast => ast.Id);
            builder.Entity<ApplicationStage>()
                .Property(ast => ast.StageType).IsRequired().HasMaxLength(30);
            builder.Entity<ApplicationStage>()
                .Property(ast => ast.StageStatus).IsRequired().HasMaxLength(20).HasDefaultValue("PENDING");
            builder.Entity<ApplicationStage>()
                .HasOne(ast => ast.JobApplication)
                .WithMany()
                .HasForeignKey(ast => ast.ApplicationId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.Entity<ApplicationStage>()
                .HasOne(ast => ast.JobPosting)
                .WithMany()
                .HasForeignKey(ast => ast.JobPostingId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.Entity<ApplicationStage>()
                .HasOne(ast => ast.Reviewer)
                .WithMany()
                .HasForeignKey(ast => ast.ReviewerId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
            builder.Entity<ApplicationStage>()
                .HasIndex(ast => ast.ApplicationId);
            builder.Entity<ApplicationStage>()
                .HasIndex(ast => ast.StageType);
            builder.Entity<ApplicationStage>()
                .HasIndex(ast => ast.StageStatus);
            builder.Entity<ApplicationStage>()
                .HasIndex(ast => ast.ReviewerId);

            // GeneralTestResult Configuration
            builder.Entity<GeneralTestResult>()
                .HasKey(gtr => gtr.Id);
            builder.Entity<GeneralTestResult>()
                .Property(gtr => gtr.TestName).HasMaxLength(255);
            builder.Entity<GeneralTestResult>()
                .HasOne(gtr => gtr.JobApplication)
                .WithMany()
                .HasForeignKey(gtr => gtr.ApplicationId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.Entity<GeneralTestResult>()
                .HasOne(gtr => gtr.Stage)
                .WithMany()
                .HasForeignKey(gtr => gtr.StageId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.Entity<GeneralTestResult>()
                .HasIndex(gtr => gtr.ApplicationId);
            builder.Entity<GeneralTestResult>()
                .HasIndex(gtr => gtr.Score);

            // CvAnalysisResult Configuration
            builder.Entity<CvAnalysisResult>()
                .HasKey(car => car.Id);
            builder.Entity<CvAnalysisResult>()
                .HasOne(car => car.JobApplication)
                .WithMany()
                .HasForeignKey(car => car.ApplicationId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.Entity<CvAnalysisResult>()
                .HasOne(car => car.Stage)
                .WithMany()
                .HasForeignKey(car => car.StageId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.Entity<CvAnalysisResult>()
                .HasOne(car => car.CvUpload)
                .WithMany()
                .HasForeignKey(car => car.CvId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.Entity<CvAnalysisResult>()
                .HasOne(car => car.AnalyzedBy)
                .WithMany()
                .HasForeignKey(car => car.AnalyzedById)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
            builder.Entity<CvAnalysisResult>()
                .HasIndex(car => car.ApplicationId);
            builder.Entity<CvAnalysisResult>()
                .HasIndex(car => car.AnalysisScore);

            // AiInterviewSession Configuration
            builder.Entity<AiInterviewSession>()
                .HasKey(ais => ais.Id);
            builder.Entity<AiInterviewSession>()
                .Property(ais => ais.SessionStatus).IsRequired().HasMaxLength(20).HasDefaultValue("PENDING");
            builder.Entity<AiInterviewSession>()
                .Property(ais => ais.AiAgentVersion).HasMaxLength(50);
            builder.Entity<AiInterviewSession>()
                .HasOne(ais => ais.JobApplication)
                .WithMany()
                .HasForeignKey(ais => ais.ApplicationId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.Entity<AiInterviewSession>()
                .HasOne(ais => ais.Stage)
                .WithMany()
                .HasForeignKey(ais => ais.StageId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.Entity<AiInterviewSession>()
                .HasOne(ais => ais.CvUpload)
                .WithMany()
                .HasForeignKey(ais => ais.CvId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.Entity<AiInterviewSession>()
                .HasOne(ais => ais.JobPosting)
                .WithMany()
                .HasForeignKey(ais => ais.JobPostingId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.Entity<AiInterviewSession>()
                .HasIndex(ais => ais.ApplicationId);
            builder.Entity<AiInterviewSession>()
                .HasIndex(ais => ais.SessionStatus);
            builder.Entity<AiInterviewSession>()
                .HasIndex(ais => ais.CompletedAt);

            // AiInterviewQa Configuration
            builder.Entity<AiInterviewQa>()
                .HasKey(aiqa => aiqa.Id);
            builder.Entity<AiInterviewQa>()
                .Property(aiqa => aiqa.QuestionCategory).IsRequired().HasMaxLength(30);
            builder.Entity<AiInterviewQa>()
                .HasOne(aiqa => aiqa.Session)
                .WithMany()
                .HasForeignKey(aiqa => aiqa.SessionId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.Entity<AiInterviewQa>()
                .HasIndex(aiqa => aiqa.SessionId);
            builder.Entity<AiInterviewQa>()
                .HasIndex(aiqa => aiqa.QuestionCategory);

            // AiInterviewSummary Configuration
            builder.Entity<AiInterviewSummary>()
                .HasKey(ais => ais.Id);
            builder.Entity<AiInterviewSummary>()
                .HasOne(ais => ais.Session)
                .WithMany()
                .HasForeignKey(ais => ais.SessionId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.Entity<AiInterviewSummary>()
                .HasOne(ais => ais.JobApplication)
                .WithMany()
                .HasForeignKey(ais => ais.ApplicationId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.Entity<AiInterviewSummary>()
                .HasIndex(ais => ais.ApplicationId);
            builder.Entity<AiInterviewSummary>()
                .HasIndex(ais => ais.OverallInterviewScore);

            // FinalEvaluationScore Configuration
            builder.Entity<FinalEvaluationScore>()
                .HasKey(fes => fes.Id);
            builder.Entity<FinalEvaluationScore>()
                .Property(fes => fes.EvaluationStatus).IsRequired().HasMaxLength(20).HasDefaultValue("PENDING");
            builder.Entity<FinalEvaluationScore>()
                .HasOne(fes => fes.JobApplication)
                .WithMany()
                .HasForeignKey(fes => fes.ApplicationId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.Entity<FinalEvaluationScore>()
                .HasOne(fes => fes.JobPosting)
                .WithMany()
                .HasForeignKey(fes => fes.JobPostingId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.Entity<FinalEvaluationScore>()
                .HasOne(fes => fes.EvaluatedBy)
                .WithMany()
                .HasForeignKey(fes => fes.EvaluatedById)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
            builder.Entity<FinalEvaluationScore>()
                .HasIndex(fes => fes.ApplicationId).IsUnique();
            builder.Entity<FinalEvaluationScore>()
                .HasIndex(fes => fes.JobPostingId);
            builder.Entity<FinalEvaluationScore>()
                .HasIndex(fes => fes.WeightedFinalScore);
            builder.Entity<FinalEvaluationScore>()
                .HasIndex(fes => fes.RankPosition);

            // MeetingInvitation Configuration
            builder.Entity<MeetingInvitation>()
                .HasKey(mi => mi.Id);
            builder.Entity<MeetingInvitation>()
                .Property(mi => mi.MeetingType).IsRequired().HasMaxLength(30).HasDefaultValue("FINAL_INTERVIEW");
            builder.Entity<MeetingInvitation>()
                .Property(mi => mi.MeetingLink).HasMaxLength(500);
            builder.Entity<MeetingInvitation>()
                .Property(mi => mi.MeetingTitle).HasMaxLength(255);
            builder.Entity<MeetingInvitation>()
                .Property(mi => mi.InvitationStatus).IsRequired().HasMaxLength(30).HasDefaultValue("PENDING");
            builder.Entity<MeetingInvitation>()
                .HasOne(mi => mi.JobApplication)
                .WithMany()
                .HasForeignKey(mi => mi.ApplicationId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.Entity<MeetingInvitation>()
                .HasOne(mi => mi.JobPosting)
                .WithMany()
                .HasForeignKey(mi => mi.JobPostingId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.Entity<MeetingInvitation>()
                .HasOne(mi => mi.CandidateProfile)
                .WithMany()
                .HasForeignKey(mi => mi.CandidateId)
                .OnDelete(DeleteBehavior.Restrict);
            // No logical change needed, just comment update to ensure I checked.
            // .HasForeignKey(mi => mi.CreatorUser)
            // .HasForeignKey(mi => mi.CreatedById) <- type is now Guid.
            builder.Entity<MeetingInvitation>()
                .HasIndex(mi => mi.ApplicationId);
            builder.Entity<MeetingInvitation>()
                .HasIndex(mi => mi.InvitationStatus);
            builder.Entity<MeetingInvitation>()
                .HasIndex(mi => mi.ScheduledDate);

            // EventLog Configuration
            builder.Entity<EventLog>()
                .HasKey(el => el.Id);
            builder.Entity<EventLog>()
                .Property(el => el.EventType).IsRequired().HasMaxLength(100);
            builder.Entity<EventLog>()
                .Property(el => el.AggregateType).IsRequired().HasMaxLength(100);
            builder.Entity<EventLog>()
                .HasOne(el => el.User)
                .WithMany()
                .HasForeignKey(el => el.UserId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
            builder.Entity<EventLog>()
                .HasIndex(el => new { el.AggregateType, el.AggregateId });
            builder.Entity<EventLog>()
                .HasIndex(el => el.EventType);
            builder.Entity<EventLog>()
                .HasIndex(el => el.CreatedAt);

            // Read Models (Views) - No Key
            builder.Entity<CandidateRankingView>()
                .HasNoKey()
                .ToView("CandidateRankingView");

            builder.Entity<ActiveJobPostingsView>()
                .HasNoKey()
                .ToView("ActiveJobPostingsView");

            builder.Entity<AiInterviewSummary>(entity =>
            {
                entity.ToTable("ai_interview_summary");
                
                entity.HasOne(a => a.Session)
                    .WithOne()
                    .HasForeignKey<AiInterviewSummary>(a => a.SessionId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                entity.HasOne(a => a.JobApplication)
                    .WithMany()
                    .HasForeignKey(a => a.ApplicationId)
                    .OnDelete(DeleteBehavior.NoAction); 
                entity.HasIndex(a => a.ApplicationId).HasDatabaseName("idx_application_id");
                entity.HasIndex(a => a.OverallInterviewScore).HasDatabaseName("idx_overall_interview_score");
            });
        }
    }
}
