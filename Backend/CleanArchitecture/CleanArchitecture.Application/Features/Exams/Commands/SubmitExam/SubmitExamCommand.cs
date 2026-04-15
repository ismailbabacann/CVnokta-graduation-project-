using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;

namespace CleanArchitecture.Core.Features.Exams.Commands.SubmitExam
{
    // ── DTOs ──────────────────────────────────────────────────────────────────

    public class AnswerSubmitDto
    {
        public Guid QuestionId { get; set; }
        public string AnswerText { get; set; }
    }

    // ── Command ────────────────────────────────────────────────────────────────

    /// <summary>
    /// POST /api/v1/exam/submit/{token}
    /// Candidate submits answers for a single exam identified by token.
    /// Auto-grades multiple_choice and true_false questions.
    /// </summary>
    public class SubmitExamCommand : IRequest<SubmitExamResponse>
    {
        /// <summary>Route parameter — identifies the assignment</summary>
        public string Token { get; set; }

        public List<AnswerSubmitDto> Answers { get; set; } = new List<AnswerSubmitDto>();
    }

    // ── Response ───────────────────────────────────────────────────────────────

    public class AutoScoreDto
    {
        public int TotalPointsPossible { get; set; }
        public int AutoEvaluatedPoints { get; set; }
        public int PendingManualReview { get; set; }
    }

    public class SubmitExamResponse
    {
        public Guid AssignmentId { get; set; }
        public DateTime SubmittedAt { get; set; }
        public AutoScoreDto AutoScore { get; set; }
        public int RemainingExams { get; set; }
        public string Message { get; set; }
    }

    // ── Handler ────────────────────────────────────────────────────────────────

    public class SubmitExamCommandHandler : IRequestHandler<SubmitExamCommand, SubmitExamResponse>
    {
        private readonly IGenericRepositoryAsync<CandidateExamAssignment> _assignmentRepo;
        private readonly IGenericRepositoryAsync<Question> _questionRepo;
        private readonly IGenericRepositoryAsync<CandidateAnswer> _answerRepo;

        public SubmitExamCommandHandler(
            IGenericRepositoryAsync<CandidateExamAssignment> assignmentRepo,
            IGenericRepositoryAsync<Question> questionRepo,
            IGenericRepositoryAsync<CandidateAnswer> answerRepo)
        {
            _assignmentRepo = assignmentRepo;
            _questionRepo = questionRepo;
            _answerRepo = answerRepo;
        }

        public async Task<SubmitExamResponse> Handle(SubmitExamCommand request, CancellationToken cancellationToken)
        {
            // 1. Find assignment by token
            var allAssignments = (List<CandidateExamAssignment>)await _assignmentRepo.GetAllAsync();
            var assignment = allAssignments.FirstOrDefault(a => a.Token == request.Token)
                ?? throw new Exception("Invalid or expired exam token.");

            // 2. Guard: already submitted
            if (assignment.Status == "submitted")
                throw new Exception("This exam has already been submitted.");

            // 3. Guard: expired
            if (assignment.ExpiresAt.HasValue && assignment.ExpiresAt.Value < DateTime.UtcNow)
                throw new Exception("This exam token has expired.");

            // 4. Load questions for auto-grading
            var allQuestions = (List<Question>)await _questionRepo.GetAllAsync();
            var examQuestions = allQuestions.Where(q => q.ExamId == assignment.ExamId).ToList();

            int autoPoints = 0;
            int pendingPoints = 0;
            int totalPoints = examQuestions.Sum(q => q.Points);

            var submittedAt = DateTime.UtcNow;

            // 5. Save answers + auto-grade
            foreach (var answerDto in request.Answers)
            {
                var question = examQuestions.FirstOrDefault(q => q.Id == answerDto.QuestionId);
                if (question == null) continue;

                bool? isCorrect = null;
                int? pointsEarned = null;

                if (question.QuestionType == "multiple_choice" || question.QuestionType == "true_false")
                {
                    isCorrect = string.Equals(
                        answerDto.AnswerText?.Trim(),
                        question.CorrectAnswer?.Trim(),
                        StringComparison.OrdinalIgnoreCase);
                    pointsEarned = isCorrect.Value ? question.Points : 0;
                    autoPoints += pointsEarned.Value;
                }
                else
                {
                    // open_ended — pending manual review
                    pendingPoints += question.Points;
                }

                var answer = new CandidateAnswer
                {
                    Id = Guid.NewGuid(),
                    AssignmentId = assignment.Id,
                    QuestionId = answerDto.QuestionId,
                    AnswerText = answerDto.AnswerText,
                    IsCorrect = isCorrect,
                    PointsEarned = pointsEarned,
                    AnsweredAt = submittedAt
                };

                await _answerRepo.AddAsync(answer);
            }

            // 6. Update assignment status and score
            assignment.Status = "submitted";
            assignment.SubmittedAt = submittedAt;
            assignment.Score = autoPoints;
            await _assignmentRepo.UpdateAsync(assignment);

            // 7. Count remaining (pending/in_progress) exams for this candidate & job
            int remaining = allAssignments.Count(a =>
                a.CandidateId == assignment.CandidateId &&
                a.JobId == assignment.JobId &&
                a.Id != assignment.Id &&
                (a.Status == "pending" || a.Status == "opened" || a.Status == "in_progress"));

            return new SubmitExamResponse
            {
                AssignmentId = assignment.Id,
                SubmittedAt = submittedAt,
                AutoScore = new AutoScoreDto
                {
                    TotalPointsPossible = totalPoints,
                    AutoEvaluatedPoints = autoPoints,
                    PendingManualReview = pendingPoints
                },
                RemainingExams = remaining,
                Message = remaining == 0
                    ? "Tüm sınavlarınızı tamamladınız. Sonuçlarınız değerlendirildikten sonra bilgilendirileceksiniz."
                    : $"{remaining} sınavınız daha bulunmaktadır."
            };
        }
    }
}
