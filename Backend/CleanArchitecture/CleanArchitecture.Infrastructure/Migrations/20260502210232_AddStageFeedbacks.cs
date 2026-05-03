using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanArchitecture.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStageFeedbacks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StageFeedbacks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ApplicationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StageType = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    HrStrengths = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    HrWeaknesses = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    HrOverall = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CandidateStrengths = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CandidateWeaknesses = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CandidateOverall = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Created = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModified = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StageFeedbacks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StageFeedbacks_JobApplications_ApplicationId",
                        column: x => x.ApplicationId,
                        principalTable: "JobApplications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StageFeedbacks_ApplicationId",
                table: "StageFeedbacks",
                column: "ApplicationId");

            migrationBuilder.CreateIndex(
                name: "IX_StageFeedbacks_ApplicationId_StageType",
                table: "StageFeedbacks",
                columns: new[] { "ApplicationId", "StageType" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StageFeedbacks");
        }
    }
}
