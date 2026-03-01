using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CleanArchitecture.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddJobPostingNewFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "JobDescription",
                table: "JobPostings");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "JobPostings",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Draft",
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20,
                oldDefaultValue: "DRAFT");

            migrationBuilder.AddColumn<string>(
                name: "AboutCompany",
                table: "JobPostings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "AiScanEnabled",
                table: "JobPostings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "AutoEmailEnabled",
                table: "JobPostings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Benefits",
                table: "JobPostings",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDraft",
                table: "JobPostings",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "MinMatchScore",
                table: "JobPostings",
                type: "int",
                nullable: false,
                defaultValue: 70);

            migrationBuilder.AddColumn<string>(
                name: "RequiredQualifications",
                table: "JobPostings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Responsibilities",
                table: "JobPostings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WorkModel",
                table: "JobPostings",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WorkType",
                table: "JobPostings",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_JobPostings_IsDraft",
                table: "JobPostings",
                column: "IsDraft");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_JobPostings_IsDraft",
                table: "JobPostings");

            migrationBuilder.DropColumn(
                name: "AboutCompany",
                table: "JobPostings");

            migrationBuilder.DropColumn(
                name: "AiScanEnabled",
                table: "JobPostings");

            migrationBuilder.DropColumn(
                name: "AutoEmailEnabled",
                table: "JobPostings");

            migrationBuilder.DropColumn(
                name: "Benefits",
                table: "JobPostings");

            migrationBuilder.DropColumn(
                name: "IsDraft",
                table: "JobPostings");

            migrationBuilder.DropColumn(
                name: "MinMatchScore",
                table: "JobPostings");

            migrationBuilder.DropColumn(
                name: "RequiredQualifications",
                table: "JobPostings");

            migrationBuilder.DropColumn(
                name: "Responsibilities",
                table: "JobPostings");

            migrationBuilder.DropColumn(
                name: "WorkModel",
                table: "JobPostings");

            migrationBuilder.DropColumn(
                name: "WorkType",
                table: "JobPostings");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "JobPostings",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "DRAFT",
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20,
                oldDefaultValue: "Draft");

            migrationBuilder.AddColumn<string>(
                name: "JobDescription",
                table: "JobPostings",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
