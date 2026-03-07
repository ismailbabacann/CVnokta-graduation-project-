using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanArchitecture.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCandidateRankingView : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                CREATE OR ALTER VIEW [dbo].[CandidateRankingView] AS
                SELECT 
                    A.Id AS ApplicationId,
                    A.JobPostingId,
                    A.CandidateId,
                    P.FullName AS CandidateFullName,
                    A.ApplicationStatus,
                    A.LastModified as LastUpdated,
                    C.AnalysisScore AS CvAnalysisScore,
                    G.Score AS GeneralTestScore,
                    I.OverallInterviewScore AS AiInterviewScore,
                    F.WeightedFinalScore AS FinalWeightedScore,
                    F.RankPosition
                FROM JobApplications A
                INNER JOIN CandidateProfiles P ON A.CandidateId = P.Id
                LEFT JOIN CvAnalysisResults C ON A.Id = C.ApplicationId
                LEFT JOIN GeneralTestResults G ON A.Id = G.ApplicationId
                LEFT JOIN ai_interview_summary I ON A.Id = I.ApplicationId
                LEFT JOIN FinalEvaluationScores F ON A.Id = F.ApplicationId
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP VIEW IF EXISTS [dbo].[CandidateRankingView];");
        }
    }
}
