using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.CandidateExams.Queries.GetCandidateExamResultDetails
{
    public class GetCandidateExamResultDetailsQuery : IRequest<CandidateExamResultDetailsViewModel>
    {
        public Guid AssignmentId { get; set; }
    }

    public class CandidateExamResultDetailsViewModel
    {
        public Guid AssignmentId { get; set; }
        public string CandidateName { get; set; }
        public string ExamTitle { get; set; }
        public string ExamType { get; set; }
        public int TotalScore { get; set; }
        public DateTime? SubmittedAt { get; set; }

        public List<CandidateAnswerDetailDto> Answers { get; set; } = new List<CandidateAnswerDetailDto>();
    }

    public class CandidateAnswerDetailDto
    {
        public Guid QuestionId { get; set; }
        public string QuestionText { get; set; }
        public string QuestionType { get; set; }
        public string QuestionCategory { get; set; }
        public string MediaUrl { get; set; }
        public string OptionsJson { get; set; }
        public string CorrectAnswer { get; set; }
        
        public string CandidateAnswerText { get; set; }
        public bool? IsCorrect { get; set; }
        public int? PointsEarned { get; set; }
    }

    public class GetCandidateExamResultDetailsQueryHandler : IRequestHandler<GetCandidateExamResultDetailsQuery, CandidateExamResultDetailsViewModel>
    {
        private readonly IGenericRepositoryAsync<CandidateExamAssignment> _assignmentRepo;
        private readonly IGenericRepositoryAsync<CandidateAnswer> _answerRepo;
        private readonly IGenericRepositoryAsync<CandidateProfile> _profileRepo;
        private readonly IGenericRepositoryAsync<Exam> _examRepo;
        private readonly IGenericRepositoryAsync<Question> _questionRepo;

        public GetCandidateExamResultDetailsQueryHandler(
            IGenericRepositoryAsync<CandidateExamAssignment> assignmentRepo,
            IGenericRepositoryAsync<CandidateAnswer> answerRepo,
            IGenericRepositoryAsync<CandidateProfile> profileRepo,
            IGenericRepositoryAsync<Exam> examRepo,
            IGenericRepositoryAsync<Question> questionRepo)
        {
            _assignmentRepo = assignmentRepo;
            _answerRepo = answerRepo;
            _profileRepo = profileRepo;
            _examRepo = examRepo;
            _questionRepo = questionRepo;
        }

        public async Task<CandidateExamResultDetailsViewModel> Handle(GetCandidateExamResultDetailsQuery request, CancellationToken cancellationToken)
        {
            var assignment = await _assignmentRepo.GetByIdAsync(request.AssignmentId);
            if (assignment == null) return null;

            var profile = await _profileRepo.GetByIdAsync(assignment.CandidateId);
            var exam = await _examRepo.GetByIdAsync(assignment.ExamId);
            
            var allQuestions = await _questionRepo.GetAllAsync();
            var examQuestions = allQuestions.Where(q => q.ExamId == exam.Id).OrderBy(q => q.OrderIndex).ToList();

            var allAnswers = await _answerRepo.GetAllAsync();
            var candidateAnswers = allAnswers.Where(a => a.AssignmentId == assignment.Id).ToList();

            var response = new CandidateExamResultDetailsViewModel
            {
                AssignmentId = assignment.Id,
                CandidateName = profile?.FullName ?? "Unknown",
                ExamTitle = exam?.Title,
                ExamType = exam?.ExamType,
                TotalScore = (int)(assignment.Score ?? 0),
                SubmittedAt = assignment.SubmittedAt,
                Answers = new List<CandidateAnswerDetailDto>()
            };

            foreach (var q in examQuestions)
            {
                var ans = candidateAnswers.FirstOrDefault(a => a.QuestionId == q.Id);
                response.Answers.Add(new CandidateAnswerDetailDto
                {
                    QuestionId = q.Id,
                    QuestionText = q.QuestionText,
                    QuestionType = q.QuestionType,
                    QuestionCategory = q.QuestionCategory,
                    MediaUrl = q.MediaUrl,
                    OptionsJson = q.OptionsJson,
                    CorrectAnswer = q.CorrectAnswer,
                    CandidateAnswerText = ans?.AnswerText,
                    IsCorrect = ans?.IsCorrect,
                    PointsEarned = ans?.PointsEarned
                });
            }

            return response;
        }
    }
}
