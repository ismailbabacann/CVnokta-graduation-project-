using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using CleanArchitecture.Application.Features.JobPostings.Queries.GenerateJobPostingDetails;
using CleanArchitecture.Application.Features.JobPostings.Queries.GenerateEnglishExam;
using CleanArchitecture.Application.Interfaces;
using CleanArchitecture.Core.Settings;
using Microsoft.Extensions.Options;

namespace CleanArchitecture.Infrastructure.Services
{
    public class HttpAiJobPostingGenerationService : IAiJobPostingGenerationService
    {
        private readonly HttpClient _httpClient;
        private readonly AiSettings _aiSettings;

        public HttpAiJobPostingGenerationService(HttpClient httpClient, IOptions<AiSettings> aiSettings)
        {
            _httpClient = httpClient;
            _aiSettings = aiSettings.Value;
            
            _httpClient.BaseAddress = new Uri(_aiSettings.BaseUrl.EndsWith("/") ? _aiSettings.BaseUrl : _aiSettings.BaseUrl + "/");
            
            if (!string.IsNullOrEmpty(_aiSettings.ApiKey))
            {
                _httpClient.DefaultRequestHeaders.Add("X-Api-Key", _aiSettings.ApiKey);
            }
        }

        public async Task<GeneratedJobPostingDto> GenerateJobPostingAsync(string applicationContext)
        {
            var requestBody = new { context = applicationContext };
            var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync("backend/generate-job-posting", content);
            response.EnsureSuccessStatusCode();

            var responseString = await response.Content.ReadAsStringAsync();
            var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            return JsonSerializer.Deserialize<GeneratedJobPostingDto>(responseString, options);
        }

        public async Task<GeneratedExamDto> GenerateEnglishExamAsync(string testContext)
        {
            var requestBody = new { testContext = testContext };
            var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync("backend/generate-exam", content);
            response.EnsureSuccessStatusCode();

            var responseString = await response.Content.ReadAsStringAsync();
            var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            return JsonSerializer.Deserialize<GeneratedExamDto>(responseString, options);
        }

        public async Task<string> GetExamFeedbackAsync(Guid applicationId, string jobTitle, int totalQuestions, int correctAnswers, decimal score, bool passed, List<CleanArchitecture.Core.Features.Exams.Commands.SubmitExam.QuestionResultDto> results)
        {
            var payload = new
            {
                applicationId = applicationId.ToString(),
                jobTitle = jobTitle,
                totalQuestions = totalQuestions,
                correctAnswers = correctAnswers,
                score = (double)score,
                passed = passed,
                results = results
            };

            var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            var content = new StringContent(JsonSerializer.Serialize(payload, options), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("backend/analyze-test-results", content);
            
            if (!response.IsSuccessStatusCode)
                return "Sınav sonucunuz sistem tarafından değerlendirildi. Detaylar için İK ekibiyle iletişime geçebilirsiniz.";

            var responseString = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseString);
            return doc.RootElement.GetProperty("feedback").GetString();
        }

        public async Task AnalyzeCvAsync(Guid applicationId, string cvFilePath, CleanArchitecture.Core.Entities.JobPosting jobPosting, Guid stageId, Guid cvId)
        {
            var payload = new
            {
                application_id = applicationId.ToString(),
                stage_id = stageId.ToString(),
                cv_id = cvId.ToString(),
                cv_file_path = cvFilePath,
                job_posting = new
                {
                    job_title = jobPosting.JobTitle,
                    required_skills = jobPosting.RequiredSkills,
                    required_qualifications = jobPosting.RequiredQualifications,
                    responsibilities = jobPosting.Responsibilities,
                    min_match_score = jobPosting.PipelinePassThreshold
                }
            };

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            
            // Fire-and-forget: we don't wait for the analysis to finish here because it calls back v1/cvanalysis/save-score
            try
            {
                await _httpClient.PostAsync("cv/analyze", content);
            }
            catch (Exception ex)
            {
                // Log or handle error - here we just ignore to not block the application submission
                Console.WriteLine($"CV Analysis trigger failed: {ex.Message}");
            }
        }
    }
}
