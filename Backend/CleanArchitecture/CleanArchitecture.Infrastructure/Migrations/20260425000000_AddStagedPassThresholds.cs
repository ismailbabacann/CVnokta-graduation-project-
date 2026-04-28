using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanArchitecture.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStagedPassThresholds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('JobPostings') AND name = 'CvPassThreshold')
                    ALTER TABLE [JobPostings] ADD [CvPassThreshold] int NOT NULL DEFAULT 60;
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('JobPostings') AND name = 'EnglishPassThreshold')
                    ALTER TABLE [JobPostings] ADD [EnglishPassThreshold] int NOT NULL DEFAULT 70;
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('JobPostings') AND name = 'TechnicalPassThreshold')
                    ALTER TABLE [JobPostings] ADD [TechnicalPassThreshold] int NOT NULL DEFAULT 70;
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('JobPostings') AND name = 'AiInterviewPassThreshold')
                    ALTER TABLE [JobPostings] ADD [AiInterviewPassThreshold] int NOT NULL DEFAULT 60;
            ");

            // Sync existing PipelinePassThreshold to CvPassThreshold for backward compatibility
            migrationBuilder.Sql(@"
                UPDATE [JobPostings]
                SET [CvPassThreshold] = [PipelinePassThreshold]
                WHERE [CvPassThreshold] = 60 AND [PipelinePassThreshold] != 60;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('JobPostings') AND name = 'CvPassThreshold')
                    ALTER TABLE [JobPostings] DROP COLUMN [CvPassThreshold];
            ");

            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('JobPostings') AND name = 'EnglishPassThreshold')
                    ALTER TABLE [JobPostings] DROP COLUMN [EnglishPassThreshold];
            ");

            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('JobPostings') AND name = 'TechnicalPassThreshold')
                    ALTER TABLE [JobPostings] DROP COLUMN [TechnicalPassThreshold];
            ");

            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('JobPostings') AND name = 'AiInterviewPassThreshold')
                    ALTER TABLE [JobPostings] DROP COLUMN [AiInterviewPassThreshold];
            ");
        }
    }
}
