using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;

namespace CleanArchitecture.Core.Features.Exams.Queries.GetJobExams
{
    // ── Response DTOs ─────────────────────────────────────────────────────────

    public class JobExamDto
    {
        public Guid ExamId { get; set; }
        public string Title { get; set; }
        public string ExamType { get; set; }
        public int? SequenceOrder { get; set; }
        public bool IsMandatory { get; set; }
        public int QuestionCount { get; set; }
        public int TotalPoints { get; set; }
        public string Status { get; set; }
        public int? TimeLimitMinutes { get; set; }
        public DateTime? ApprovedAt { get; set; }
    }

    public class GetJobExamsResponse
    {
        public Guid JobId { get; set; }
        public List<JobExamDto> Exams { get; set; } = new List<JobExamDto>();
    }

    // ── Query ─────────────────────────────────────────────────────────────────

    /// <summary>
    /// GET /api/v1/jobs/{jobId}/exams
    /// Returns all approved exams for a given job posting.
    /// </summary>
    public class GetJobExamsQuery : IRequest<GetJobExamsResponse>
    {
        public Guid JobId { get; set; }
    }

    // ── Handler ───────────────────────────────────────────────────────────────

    public class GetJobExamsQueryHandler : IRequestHandler<GetJobExamsQuery, GetJobExamsResponse>
    {
        private readonly IGenericRepositoryAsync<Exam> _examRepo;
        private readonly IGenericRepositoryAsync<Question> _questionRepo;

        public GetJobExamsQueryHandler(
            IGenericRepositoryAsync<Exam> examRepo,
            IGenericRepositoryAsync<Question> questionRepo)
        {
            _examRepo = examRepo;
            _questionRepo = questionRepo;
        }

        public async Task<GetJobExamsResponse> Handle(GetJobExamsQuery request, CancellationToken cancellationToken)
        {
            var allExams = (List<Exam>)await _examRepo.GetAllAsync();
            var allQuestions = (List<Question>)await _questionRepo.GetAllAsync();

            var jobExams = allExams
                .Where(e => e.JobId == request.JobId && e.Status != "archived")
                .OrderBy(e => e.SequenceOrder ?? int.MaxValue)
                .Select(e => new JobExamDto
                {
                    ExamId = e.Id,
                    Title = e.Title,
                    ExamType = e.ExamType,
                    SequenceOrder = e.SequenceOrder,
                    IsMandatory = e.IsMandatory,
                    Status = e.Status,
                    TimeLimitMinutes = e.TimeLimitMinutes,
                    ApprovedAt = e.ApprovedAt,
                    QuestionCount = allQuestions.Count(q => q.ExamId == e.Id),
                    TotalPoints = allQuestions.Where(q => q.ExamId == e.Id).Sum(q => q.Points)
                })
                .ToList();

            return new GetJobExamsResponse
            {
                JobId = request.JobId,
                Exams = jobExams
            };
        }
    }
}
