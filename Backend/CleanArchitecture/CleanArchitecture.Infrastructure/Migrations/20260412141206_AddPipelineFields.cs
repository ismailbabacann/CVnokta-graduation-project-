using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanArchitecture.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPipelineFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotent: only add columns if they don't already exist
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('JobApplications') AND name = 'CurrentPipelineStage')
                    ALTER TABLE [JobApplications] ADD [CurrentPipelineStage] nvarchar(max) NULL;

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('JobApplications') AND name = 'PipelineStageUpdatedAt')
                    ALTER TABLE [JobApplications] ADD [PipelineStageUpdatedAt] datetime2 NULL;

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('JobApplications') AND name = 'RejectionReason')
                    ALTER TABLE [JobApplications] ADD [RejectionReason] nvarchar(max) NULL;

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('JobPostings') AND name = 'PipelinePassThreshold')
                    ALTER TABLE [JobPostings] ADD [PipelinePassThreshold] int NOT NULL DEFAULT 70;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('JobApplications') AND name = 'CurrentPipelineStage')
                    ALTER TABLE [JobApplications] DROP COLUMN [CurrentPipelineStage];

                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('JobApplications') AND name = 'PipelineStageUpdatedAt')
                    ALTER TABLE [JobApplications] DROP COLUMN [PipelineStageUpdatedAt];

                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('JobApplications') AND name = 'RejectionReason')
                    ALTER TABLE [JobApplications] DROP COLUMN [RejectionReason];

                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('JobPostings') AND name = 'PipelinePassThreshold')
                    ALTER TABLE [JobPostings] DROP COLUMN [PipelinePassThreshold];
            ");
        }
    }
}
