using CleanArchitecture.Core.Entities;
using CleanArchitecture.Application.Interfaces;
using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Core.Settings;
using MediatR;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Evaluations.Commands.CalculateFinalScore
{
    public class CalculateFinalScoreCommand : IRequest<Guid>
    {
        public Guid ApplicationId { get; set; }
    }

    public class CalculateFinalScoreCommandHandler : IRequestHandler<CalculateFinalScoreCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<JobApplication> _applicationRepository;
        private readonly IGenericRepositoryAsync<CvAnalysisResult> _cvRepository;
        private readonly IGenericRepositoryAsync<GeneralTestResult> _testRepository;
        private readonly IGenericRepositoryAsync<AiInterviewSummary> _interviewRepository;
        private readonly IGenericRepositoryAsync<FinalEvaluationScore> _finalScoreRepository;
        private readonly HttpClient _httpClient;
        private readonly AiSettings _aiSettings;

        public CalculateFinalScoreCommandHandler(
            IGenericRepositoryAsync<JobApplication> applicationRepository,
            IGenericRepositoryAsync<CvAnalysisResult> cvRepository,
            IGenericRepositoryAsync<GeneralTestResult> testRepository,
            IGenericRepositoryAsync<AiInterviewSummary> interviewRepository,
            IGenericRepositoryAsync<FinalEvaluationScore> finalScoreRepository,
            IHttpClientFactory httpClientFactory,
            IOptions<AiSettings> aiSettings)
        {
            _applicationRepository = applicationRepository;
            _cvRepository = cvRepository;
            _testRepository = testRepository;
            _interviewRepository = interviewRepository;
            _finalScoreRepository = finalScoreRepository;
            _httpClient = httpClientFactory.CreateClient();
            _aiSettings = aiSettings.Value;
        }

        public async Task<Guid> Handle(CalculateFinalScoreCommand request, CancellationToken cancellationToken)
        {
            var app = await _applicationRepository.GetByIdAsync(request.ApplicationId);
            if (app == null) throw new Exception("Application not found");

            var cvResults = await _cvRepository.GetAllAsync();
            var cvScore = cvResults.FirstOrDefault(c => c.ApplicationId == request.ApplicationId)?.AnalysisScore ?? 0;

            var testResults = await _testRepository.GetAllAsync();
            var generalTest = testResults.FirstOrDefault(t => t.ApplicationId == request.ApplicationId && t.TestName != null && t.TestName.Contains("Skill"))?.Score ?? 0;
            var englishTest = testResults.FirstOrDefault(t => t.ApplicationId == request.ApplicationId && t.TestName != null && t.TestName.Contains("English"))?.Score ?? 0;

            var interviewResults = await _interviewRepository.GetAllAsync();
            var interviewScore = interviewResults.FirstOrDefault(i => i.ApplicationId == request.ApplicationId)?.OverallInterviewScore ?? 0;

            var payload = new 
            {
                application_id = request.ApplicationId.ToString(),
                candidate_id = app.CandidateId.ToString(),
                candidate_name = "Candidate", 
                cv_score = cvScore,
                general_test_score = generalTest,
                english_test_score = englishTest,
                interview_score = interviewScore
            };

            var requestBody = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            var baseUrl = _aiSettings.BaseUrl.EndsWith("/") ? _aiSettings.BaseUrl : _aiSettings.BaseUrl + "/";
            var requestUri = new Uri(new Uri(baseUrl), "rankings/evaluate");

            var httpRequest = new HttpRequestMessage(HttpMethod.Post, requestUri) { Content = requestBody };
            if (!string.IsNullOrEmpty(_aiSettings.ApiKey)) httpRequest.Headers.Add("X-Api-Key", _aiSettings.ApiKey);

            var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
            response.EnsureSuccessStatusCode();

            var respString = await response.Content.ReadAsStringAsync(cancellationToken);
            var resultDict = JsonSerializer.Deserialize<JsonElement>(respString);
            decimal finalWeighted = resultDict.GetProperty("weighted_total").GetDecimal();

            var existing = (await _finalScoreRepository.GetAllAsync()).FirstOrDefault(f => f.ApplicationId == request.ApplicationId);
            if (existing != null)
            {
                existing.CvAnalysisScore = cvScore;
                existing.GeneralTestScore = generalTest;
                existing.AiInterviewScore = interviewScore;
                existing.WeightedFinalScore = finalWeighted;
                existing.EvaluationStatus = "Completed";
                existing.EvaluatedAt = DateTime.UtcNow;
                await _finalScoreRepository.UpdateAsync(existing);
                return existing.Id;
            }
            else
            {
                var newRec = new FinalEvaluationScore
                {
                    ApplicationId = request.ApplicationId,
                    JobPostingId = app.JobPostingId,
                    CvAnalysisScore = cvScore,
                    GeneralTestScore = generalTest,
                    AiInterviewScore = interviewScore,
                    WeightedFinalScore = finalWeighted,
                    EvaluationStatus = "Completed",
                    EvaluatedAt = DateTime.UtcNow
                };
                await _finalScoreRepository.AddAsync(newRec);
                return newRec.Id;
            }
        }
    }
}
