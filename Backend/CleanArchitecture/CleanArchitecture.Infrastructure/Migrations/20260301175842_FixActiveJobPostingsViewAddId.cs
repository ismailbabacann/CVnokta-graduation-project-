using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanArchitecture.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixActiveJobPostingsViewAddId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop and recreate the view with the Id column that EF Core expects
            migrationBuilder.Sql(@"
CREATE OR ALTER VIEW [dbo].[ActiveJobPostingsView] AS
SELECT
    NEWID()            AS Id,
    jp.Id              AS JobPostingId,
    jp.JobTitle        AS JobTitle,
    jp.Department      AS Department,
    jp.PostedDate      AS PostingDate,
    jp.ClosingDate     AS ClosingDate,
    COUNT(ja.Id)                                                    AS TotalApplications,
    SUM(CASE WHEN ja.ApplicationStatus = 'SUBMITTED' THEN 1 ELSE 0 END)  AS ScreeningPending,
    SUM(CASE WHEN ja.ApplicationStatus = 'IN_REVIEW'  THEN 1 ELSE 0 END) AS InEvaluation,
    SUM(CASE WHEN ja.ApplicationStatus = 'APPROVED'   THEN 1 ELSE 0 END) AS ApprovedCandidates,
    SUM(CASE WHEN ja.ApplicationStatus = 'REJECTED'   THEN 1 ELSE 0 END) AS RejectedCandidates,
    jp.LastModified    AS UpdatedAt
FROM JobPostings jp
LEFT JOIN JobApplications ja ON ja.JobPostingId = jp.Id
WHERE jp.Status = 'Active' AND jp.IsDraft = 0
GROUP BY
    jp.Id, jp.JobTitle, jp.Department, jp.PostedDate,
    jp.ClosingDate, jp.LastModified
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Revert to old view without Id column
            migrationBuilder.Sql(@"
CREATE OR ALTER VIEW [dbo].[ActiveJobPostingsView] AS
SELECT
    jp.Id              AS JobPostingId,
    jp.JobTitle        AS JobTitle,
    jp.Department      AS Department,
    jp.PostedDate      AS PostingDate,
    jp.ClosingDate     AS ClosingDate,
    COUNT(ja.Id)                                                    AS TotalApplications,
    SUM(CASE WHEN ja.ApplicationStatus = 'SUBMITTED' THEN 1 ELSE 0 END)  AS ScreeningPending,
    SUM(CASE WHEN ja.ApplicationStatus = 'IN_REVIEW'  THEN 1 ELSE 0 END) AS InEvaluation,
    SUM(CASE WHEN ja.ApplicationStatus = 'APPROVED'   THEN 1 ELSE 0 END) AS ApprovedCandidates,
    SUM(CASE WHEN ja.ApplicationStatus = 'REJECTED'   THEN 1 ELSE 0 END) AS RejectedCandidates,
    jp.LastModified    AS UpdatedAt
FROM JobPostings jp
LEFT JOIN JobApplications ja ON ja.JobPostingId = jp.Id
WHERE jp.Status = 'Active' AND jp.IsDraft = 0
GROUP BY
    jp.Id, jp.JobTitle, jp.Department, jp.PostedDate,
    jp.ClosingDate, jp.LastModified
            ");
        }
    }
}
