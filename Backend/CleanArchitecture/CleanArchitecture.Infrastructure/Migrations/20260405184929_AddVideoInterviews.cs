using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanArchitecture.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddVideoInterviews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "VideoInterviews",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ExternalInterviewId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CandidateId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    JobPostingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Created = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModified = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VideoInterviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VideoInterviews_CandidateProfiles_CandidateId",
                        column: x => x.CandidateId,
                        principalTable: "CandidateProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VideoInterviews_JobPostings_JobPostingId",
                        column: x => x.JobPostingId,
                        principalTable: "JobPostings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "VideoInterviewQas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VideoInterviewId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    QuestionText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AnswerText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    VideoUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Created = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastModified = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VideoInterviewQas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VideoInterviewQas_VideoInterviews_VideoInterviewId",
                        column: x => x.VideoInterviewId,
                        principalTable: "VideoInterviews",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VideoInterviewQas_VideoInterviewId",
                table: "VideoInterviewQas",
                column: "VideoInterviewId");

            migrationBuilder.CreateIndex(
                name: "IX_VideoInterviews_CandidateId",
                table: "VideoInterviews",
                column: "CandidateId");

            migrationBuilder.CreateIndex(
                name: "IX_VideoInterviews_JobPostingId",
                table: "VideoInterviews",
                column: "JobPostingId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VideoInterviewQas");

            migrationBuilder.DropTable(
                name: "VideoInterviews");
        }
    }
}
