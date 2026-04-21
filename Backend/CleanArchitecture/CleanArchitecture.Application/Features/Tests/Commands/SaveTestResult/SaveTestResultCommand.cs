using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Tests.Commands.SaveTestResult
{
    public class SaveTestResultCommand : IRequest<Guid>
    {
        public Guid ApplicationId { get; set; }
        public Guid StageId { get; set; }
        public string TestName { get; set; }
        public int? TotalQuestions { get; set; }
        public int? CorrectAnswers { get; set; }
        public int? WrongAnswers { get; set; }
        public decimal? Score { get; set; }
        public int? DurationSeconds { get; set; }
        public bool? Passed { get; set; }
    }

    public class SaveTestResultCommandHandler : IRequestHandler<SaveTestResultCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<GeneralTestResult> _testResultRepository;
        private readonly IPipelineService _pipelineService;

        public SaveTestResultCommandHandler(
            IGenericRepositoryAsync<GeneralTestResult> testResultRepository,
            IPipelineService pipelineService)
        {
            _testResultRepository = testResultRepository;
            _pipelineService = pipelineService;
        }

        public async Task<Guid> Handle(SaveTestResultCommand request, CancellationToken cancellationToken)
        {
            var result = new GeneralTestResult
            {
                ApplicationId = request.ApplicationId,
                StageId = request.StageId,
                TestName = request.TestName,
                TotalQuestions = request.TotalQuestions,
                CorrectAnswers = request.CorrectAnswers,
                WrongAnswers = request.WrongAnswers,
                Score = request.Score,
                DurationSeconds = request.DurationSeconds,
                Passed = request.Passed,
                TestDate = DateTime.UtcNow
            };

            await _testResultRepository.AddAsync(result);

            try
            {
                string stageType = request.TestName != null && request.TestName.Contains("English") ? "ENGLISH_TEST" : "SKILLS_TEST";
                decimal score = request.Score ?? 0m;
                await _pipelineService.AdvanceIfEligibleAsync(request.ApplicationId, stageType, score);
            }
            catch { /* Ignore */ }

            return result.Id;
        }
    }
}
