using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;

namespace CleanArchitecture.Core.Features.Exams.Commands.GradeExam
{
    // ── DTOs ──────────────────────────────────────────────────────────────────

    public class GradeItemDto
    {
        public Guid AnswerId { get; set; }
        public int PointsEarned { get; set; }
        public bool IsCorrect { get; set; }
        public string Feedback { get; set; }
    }

    // ── Command ────────────────────────────────────────────────────────────────

    /// <summary>
    /// PATCH /api/v1/exam/grade
    /// HR manually grades open-ended answers and updates assignment score.
    /// </summary>
    public class GradeExamCommand : IRequest<GradeExamResponse>
    {
        public List<GradeItemDto> Grades { get; set; } = new List<GradeItemDto>();
    }

    // ── Response ───────────────────────────────────────────────────────────────

    public class GradeExamResponse
    {
        public int GradedAnswers { get; set; }
        public List<Guid> UpdatedAssignmentIds { get; set; } = new List<Guid>();
    }

    // ── Handler ────────────────────────────────────────────────────────────────

    public class GradeExamCommandHandler : IRequestHandler<GradeExamCommand, GradeExamResponse>
    {
        private readonly IGenericRepositoryAsync<CandidateAnswer> _answerRepo;
        private readonly IGenericRepositoryAsync<CandidateExamAssignment> _assignmentRepo;

        public GradeExamCommandHandler(
            IGenericRepositoryAsync<CandidateAnswer> answerRepo,
            IGenericRepositoryAsync<CandidateExamAssignment> assignmentRepo)
        {
            _answerRepo = answerRepo;
            _assignmentRepo = assignmentRepo;
        }

        public async Task<GradeExamResponse> Handle(GradeExamCommand request, CancellationToken cancellationToken)
        {
            var allAnswers = (List<CandidateAnswer>)await _answerRepo.GetAllAsync();
            var affectedAssignmentIds = new HashSet<Guid>();

            // 1. Update each graded answer
            foreach (var grade in request.Grades)
            {
                var answer = allAnswers.FirstOrDefault(a => a.Id == grade.AnswerId);
                if (answer == null) continue;

                answer.IsCorrect = grade.IsCorrect;
                answer.PointsEarned = grade.PointsEarned;
                answer.GradingFeedback = grade.Feedback;
                await _answerRepo.UpdateAsync(answer);
                affectedAssignmentIds.Add(answer.AssignmentId);
            }

            // 2. Recalculate total score for each affected assignment
            var allAnswersRefresh = (List<CandidateAnswer>)await _answerRepo.GetAllAsync();
            foreach (var assignmentId in affectedAssignmentIds)
            {
                var assignment = await _assignmentRepo.GetByIdAsync(assignmentId);
                if (assignment == null) continue;

                var assignmentAnswers = allAnswersRefresh.Where(a => a.AssignmentId == assignmentId).ToList();
                assignment.Score = assignmentAnswers.Sum(a => a.PointsEarned ?? 0);
                await _assignmentRepo.UpdateAsync(assignment);
            }

            return new GradeExamResponse
            {
                GradedAnswers = request.Grades.Count,
                UpdatedAssignmentIds = affectedAssignmentIds.ToList()
            };
        }
    }
}
