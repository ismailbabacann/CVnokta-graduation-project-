using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;

namespace CleanArchitecture.Core.Features.Exams.Commands.ApproveExam
{
    // ── DTOs ──────────────────────────────────────────────────────────────────

    public class QuestionDto
    {
        public string QuestionText { get; set; }

        /// <summary>multiple_choice | true_false | open_ended</summary>
        public string QuestionType { get; set; }

        /// <summary>JSON array string: [{"key":"A","text":"..."},...]</summary>
        public string OptionsJson { get; set; }

        /// <summary>Correct answer key; NULL for open_ended</summary>
        public string CorrectAnswer { get; set; }

        public int Points { get; set; } = 10;
        public int OrderIndex { get; set; }
    }

    // ── Command ────────────────────────────────────────────────────────────────

    /// <summary>
    /// POST /api/v1/exam/approve/{examId}
    /// HR approves AI-generated questions and saves the exam + questions to DB.
    /// The examId route param is kept for future preview workflow;
    /// currently the exam is created fresh from this payload.
    /// </summary>
    public class ApproveExamCommand : IRequest<ApproveExamResponse>
    {
        public string Title { get; set; }
        public Guid JobId { get; set; }

        /// <summary>technical | personality | case_study | general</summary>
        public string ExamType { get; set; }

        public int? SequenceOrder { get; set; }
        public bool IsMandatory { get; set; }
        public int? TimeLimitMinutes { get; set; }

        public List<QuestionDto> Questions { get; set; } = new List<QuestionDto>();
    }

    // ── Response ───────────────────────────────────────────────────────────────

    public class ApproveExamResponse
    {
        public Guid ExamId { get; set; }
        public string Status { get; set; }
        public int QuestionCount { get; set; }
        public int TotalPoints { get; set; }
    }

    // ── Handler ────────────────────────────────────────────────────────────────

    public class ApproveExamCommandHandler : IRequestHandler<ApproveExamCommand, ApproveExamResponse>
    {
        private readonly IGenericRepositoryAsync<Exam> _examRepo;
        private readonly IGenericRepositoryAsync<Question> _questionRepo;

        public ApproveExamCommandHandler(
            IGenericRepositoryAsync<Exam> examRepo,
            IGenericRepositoryAsync<Question> questionRepo)
        {
            _examRepo = examRepo;
            _questionRepo = questionRepo;
        }

        public async Task<ApproveExamResponse> Handle(ApproveExamCommand request, CancellationToken cancellationToken)
        {
            // 1. Create and save Exam
            var exam = new Exam
            {
                Id = Guid.NewGuid(),
                JobId = request.JobId,
                Title = request.Title,
                ExamType = request.ExamType,
                SequenceOrder = request.SequenceOrder,
                IsMandatory = request.IsMandatory,
                TimeLimitMinutes = request.TimeLimitMinutes,
                Status = "approved",
                ApprovedAt = DateTime.UtcNow
            };

            await _examRepo.AddAsync(exam);

            // 2. Save questions
            int orderIndex = 1;
            foreach (var dto in request.Questions)
            {
                var question = new Question
                {
                    Id = Guid.NewGuid(),
                    ExamId = exam.Id,
                    QuestionText = dto.QuestionText,
                    QuestionType = dto.QuestionType,
                    OptionsJson = dto.OptionsJson,
                    CorrectAnswer = dto.CorrectAnswer,
                    Points = dto.Points > 0 ? dto.Points : 10,
                    OrderIndex = dto.OrderIndex > 0 ? dto.OrderIndex : orderIndex
                };
                await _questionRepo.AddAsync(question);
                orderIndex++;
            }

            return new ApproveExamResponse
            {
                ExamId = exam.Id,
                Status = exam.Status,
                QuestionCount = request.Questions.Count,
                TotalPoints = request.Questions.Sum(q => q.Points > 0 ? q.Points : 10)
            };
        }
    }
}
