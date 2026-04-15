using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;

namespace CleanArchitecture.Core.Features.Exams.Queries.GetExamResults
{
    // ── Response DTOs ─────────────────────────────────────────────────────────

    public class ExamSummaryDto
    {
        public Guid ExamId { get; set; }
        public string Title { get; set; }
        public int TotalPoints { get; set; }
    }

    public class CandidateExamStatusDto
    {
        public string Status { get; set; }
        public decimal? Score { get; set; }
        public DateTime? SubmittedAt { get; set; }
    }

    public class CandidateResultDto
    {
        public Guid CandidateId { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }

        /// <summary>all_submitted | partially_submitted | none_submitted | has_expired</summary>
        public string OverallStatus { get; set; }

        public decimal? TotalScore { get; set; }
        public int TotalPossible { get; set; }
        public decimal? Percentage { get; set; }

        /// <summary>examId → status info</summary>
        public Dictionary<string, CandidateExamStatusDto> Exams { get; set; } = new Dictionary<string, CandidateExamStatusDto>();
    }

    public class ExamResultMatrixResponse
    {
        public Guid JobId { get; set; }
        public List<ExamSummaryDto> Exams { get; set; } = new List<ExamSummaryDto>();
        public List<CandidateResultDto> Candidates { get; set; } = new List<CandidateResultDto>();
    }

    // ── Query ─────────────────────────────────────────────────────────────────

    /// <summary>
    /// GET /api/v1/exam/results/{jobId}
    /// Returns a candidate × exam matrix for HR.
    /// </summary>
    public class GetExamResultsQuery : IRequest<ExamResultMatrixResponse>
    {
        public Guid JobId { get; set; }

        /// <summary>Optional: filter by a specific exam</summary>
        public Guid? ExamId { get; set; }

        /// <summary>Optional: submitted | pending | expired</summary>
        public string Status { get; set; }

        /// <summary>Optional: total_score | submitted_at</summary>
        public string SortBy { get; set; }
    }

    // ── Handler ───────────────────────────────────────────────────────────────

    public class GetExamResultsQueryHandler : IRequestHandler<GetExamResultsQuery, ExamResultMatrixResponse>
    {
        private readonly IGenericRepositoryAsync<CandidateExamAssignment> _assignmentRepo;
        private readonly IGenericRepositoryAsync<Exam> _examRepo;
        private readonly IGenericRepositoryAsync<Question> _questionRepo;
        private readonly IGenericRepositoryAsync<CandidateProfile> _candidateRepo;

        public GetExamResultsQueryHandler(
            IGenericRepositoryAsync<CandidateExamAssignment> assignmentRepo,
            IGenericRepositoryAsync<Exam> examRepo,
            IGenericRepositoryAsync<Question> questionRepo,
            IGenericRepositoryAsync<CandidateProfile> candidateRepo)
        {
            _assignmentRepo = assignmentRepo;
            _examRepo = examRepo;
            _questionRepo = questionRepo;
            _candidateRepo = candidateRepo;
        }

        public async Task<ExamResultMatrixResponse> Handle(GetExamResultsQuery request, CancellationToken cancellationToken)
        {
            var allAssignments = (List<CandidateExamAssignment>)await _assignmentRepo.GetAllAsync();
            var allExams = (List<Exam>)await _examRepo.GetAllAsync();
            var allQuestions = (List<Question>)await _questionRepo.GetAllAsync();
            var allCandidates = (List<CandidateProfile>)await _candidateRepo.GetAllAsync();

            // 1. Get exams for this job
            var jobExams = allExams
                .Where(e => e.JobId == request.JobId && e.Status == "approved")
                .OrderBy(e => e.SequenceOrder ?? int.MaxValue)
                .ToList();

            if (request.ExamId.HasValue)
                jobExams = jobExams.Where(e => e.Id == request.ExamId.Value).ToList();

            var jobExamIds = jobExams.Select(e => e.Id).ToHashSet();

            // 2. Get all assignments for this job
            var jobAssignments = allAssignments
                .Where(a => a.JobId == request.JobId && jobExamIds.Contains(a.ExamId))
                .ToList();

            if (!string.IsNullOrEmpty(request.Status))
                jobAssignments = jobAssignments.Where(a => a.Status == request.Status).ToList();

            // 3. Build matrix per candidate
            var candidateIds = jobAssignments.Select(a => a.CandidateId).Distinct().ToList();

            var examSummaries = jobExams.Select(e => new ExamSummaryDto
            {
                ExamId = e.Id,
                Title = e.Title,
                TotalPoints = allQuestions.Where(q => q.ExamId == e.Id).Sum(q => q.Points)
            }).ToList();

            var candidates = new List<CandidateResultDto>();

            foreach (var candidateId in candidateIds)
            {
                var candidate = allCandidates.FirstOrDefault(c => c.Id == candidateId);
                var candidateAssignments = jobAssignments.Where(a => a.CandidateId == candidateId).ToList();

                var examMap = new Dictionary<string, CandidateExamStatusDto>();
                foreach (var exam in jobExams)
                {
                    var asgn = candidateAssignments.FirstOrDefault(a => a.ExamId == exam.Id);
                    examMap[exam.Id.ToString()] = asgn != null
                        ? new CandidateExamStatusDto
                        {
                            Status = asgn.Status,
                            Score = asgn.Score,
                            SubmittedAt = asgn.SubmittedAt
                        }
                        : new CandidateExamStatusDto { Status = "not_assigned" };
                }

                // overall_status
                bool anyExpired = candidateAssignments.Any(a => a.Status == "expired");
                bool allSubmitted = candidateAssignments.All(a => a.Status == "submitted") &&
                                    candidateAssignments.Count == jobExams.Count;
                bool anySubmitted = candidateAssignments.Any(a => a.Status == "submitted");
                string overallStatus = anyExpired ? "has_expired"
                    : allSubmitted ? "all_submitted"
                    : anySubmitted ? "partially_submitted"
                    : "none_submitted";

                decimal? totalScore = anySubmitted
                    ? candidateAssignments.Where(a => a.Score.HasValue).Sum(a => a.Score)
                    : null;

                int totalPossible = examSummaries.Sum(e => e.TotalPoints);

                decimal? percentage = null;
                if (totalScore.HasValue && totalPossible > 0 && allSubmitted)
                    percentage = Math.Round(totalScore.Value / totalPossible * 100, 1);

                candidates.Add(new CandidateResultDto
                {
                    CandidateId = candidateId,
                    Name = candidate?.FullName ?? "—",
                    Email = candidate?.Email ?? "—",
                    OverallStatus = overallStatus,
                    TotalScore = totalScore,
                    TotalPossible = totalPossible,
                    Percentage = percentage,
                    Exams = examMap
                });
            }

            // 4. Sort
            if (request.SortBy == "total_score")
                candidates = candidates.OrderByDescending(c => c.TotalScore ?? 0).ToList();
            else if (request.SortBy == "submitted_at")
                candidates = candidates
                    .OrderByDescending(c => c.Exams.Values.Max(e => e.SubmittedAt))
                    .ToList();

            return new ExamResultMatrixResponse
            {
                JobId = request.JobId,
                Exams = examSummaries,
                Candidates = candidates
            };
        }
    }
}
