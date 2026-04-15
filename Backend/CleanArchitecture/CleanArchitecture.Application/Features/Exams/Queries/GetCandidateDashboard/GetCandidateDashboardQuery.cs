using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;

namespace CleanArchitecture.Core.Features.Exams.Queries.GetCandidateDashboard
{
    // ── Response DTOs ─────────────────────────────────────────────────────────

    public class CandidateAssignmentDto
    {
        public Guid AssignmentId { get; set; }
        public string JobTitle { get; set; }
        public string ExamTitle { get; set; }
        public string ExamType { get; set; }
        public int? SequenceOrder { get; set; }
        public string Status { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public decimal? Score { get; set; }
        public int? TimeLimitMinutes { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public string ExamUrl { get; set; }
    }

    public class CandidateDashboardResponse
    {
        public Guid CandidateId { get; set; }
        public List<CandidateAssignmentDto> Assignments { get; set; } = new List<CandidateAssignmentDto>();
    }

    // ── Query ─────────────────────────────────────────────────────────────────

    /// <summary>
    /// GET /api/v1/candidate/dashboard
    /// Returns all exam assignments for the authenticated candidate.
    /// </summary>
    public class GetCandidateDashboardQuery : IRequest<CandidateDashboardResponse>
    {
        public Guid CandidateId { get; set; }
    }

    // ── Handler ───────────────────────────────────────────────────────────────

    public class GetCandidateDashboardQueryHandler : IRequestHandler<GetCandidateDashboardQuery, CandidateDashboardResponse>
    {
        private readonly IGenericRepositoryAsync<CandidateExamAssignment> _assignmentRepo;
        private readonly IGenericRepositoryAsync<Exam> _examRepo;
        private readonly IGenericRepositoryAsync<JobPosting> _jobRepo;

        public GetCandidateDashboardQueryHandler(
            IGenericRepositoryAsync<CandidateExamAssignment> assignmentRepo,
            IGenericRepositoryAsync<Exam> examRepo,
            IGenericRepositoryAsync<JobPosting> jobRepo)
        {
            _assignmentRepo = assignmentRepo;
            _examRepo = examRepo;
            _jobRepo = jobRepo;
        }

        public async Task<CandidateDashboardResponse> Handle(GetCandidateDashboardQuery request, CancellationToken cancellationToken)
        {
            var allAssignments = (List<CandidateExamAssignment>)await _assignmentRepo.GetAllAsync();
            var allExams = (List<Exam>)await _examRepo.GetAllAsync();
            var allJobs = (List<JobPosting>)await _jobRepo.GetAllAsync();

            var candidateAssignments = allAssignments
                .Where(a => a.CandidateId == request.CandidateId)
                .OrderBy(a => a.Created)
                .ToList();

            var dtos = candidateAssignments.Select(a =>
            {
                var exam = allExams.FirstOrDefault(e => e.Id == a.ExamId);
                var job = allJobs.FirstOrDefault(j => j.Id == a.JobId);

                return new CandidateAssignmentDto
                {
                    AssignmentId = a.Id,
                    JobTitle = job?.JobTitle ?? "—",
                    ExamTitle = exam?.Title ?? "—",
                    ExamType = exam?.ExamType ?? "—",
                    SequenceOrder = exam?.SequenceOrder,
                    Status = a.Status,
                    SubmittedAt = a.SubmittedAt,
                    Score = a.Score,
                    TimeLimitMinutes = exam?.TimeLimitMinutes,
                    ExpiresAt = a.ExpiresAt,
                    ExamUrl = $"https://cvnokta.com/exam/take/{a.Token}"
                };
            }).ToList();

            return new CandidateDashboardResponse
            {
                CandidateId = request.CandidateId,
                Assignments = dtos
            };
        }
    }
}
