using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Exams.Commands.CreateAIExam
{
    public class AIGeneratedQuestionDto
    {
        public string QuestionText { get; set; }
        public string QuestionType { get; set; }
        public string QuestionCategory { get; set; }
        public string OptionsJson { get; set; }
        public string CorrectAnswer { get; set; }
        public string MediaUrl { get; set; }
    }

    public class CreateAIExamCommand : IRequest<Guid>
    {
        public Guid JobId { get; set; }
        public string Title { get; set; }
        public string ExamType { get; set; }
        public List<AIGeneratedQuestionDto> Questions { get; set; }
    }

    public class CreateAIExamCommandHandler : IRequestHandler<CreateAIExamCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<Exam> _examRepository;
        private readonly IGenericRepositoryAsync<JobPosting> _jobRepository;

        public CreateAIExamCommandHandler(
            IGenericRepositoryAsync<Exam> examRepository,
            IGenericRepositoryAsync<JobPosting> jobRepository)
        {
            _examRepository = examRepository;
            _jobRepository = jobRepository;
        }

        public async Task<Guid> Handle(CreateAIExamCommand request, CancellationToken cancellationToken)
        {
            var job = await _jobRepository.GetByIdAsync(request.JobId);
            if (job == null)
            {
                throw new Exception($"JobPosting with ID {request.JobId} not found.");
            }

            var exam = new Exam
            {
                JobId = request.JobId,
                Title = request.Title,
                ExamType = request.ExamType,
                Status = "approved", // AI generated are considered approved or draft based on requirement, let's say approved.
                ApprovedAt = DateTime.UtcNow,
                IsMandatory = true
            };

            int order = 1;
            foreach (var qDto in request.Questions)
            {
                var question = new Question
                {
                    QuestionText = qDto.QuestionText,
                    QuestionType = qDto.QuestionType,
                    QuestionCategory = qDto.QuestionCategory,
                    OptionsJson = qDto.OptionsJson,
                    CorrectAnswer = qDto.CorrectAnswer,
                    MediaUrl = qDto.MediaUrl,
                    OrderIndex = order++,
                    Points = 10
                };
                exam.Questions.Add(question);
            }

            await _examRepository.AddAsync(exam);
            return exam.Id;
        }
    }
}
