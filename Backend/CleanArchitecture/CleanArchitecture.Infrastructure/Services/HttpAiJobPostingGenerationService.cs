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

        public async Task<ExamFeedbackResult> GetExamFeedbackAsync(
            Guid applicationId, string jobTitle, int totalQuestions, int correctAnswers,
            decimal score, bool passed,
            List<CleanArchitecture.Core.Features.Exams.Commands.SubmitExam.QuestionResultDto> results)
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
                return new ExamFeedbackResult { Feedback = "Sınav sonucunuz sistem tarafından değerlendirildi. Detaylar için İK ekibiyle iletişime geçebilirsiniz." };

            var responseString = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseString);
            
            var feedbackText = doc.RootElement.TryGetProperty("feedback", out var fb) ? fb.GetString() : "";
            
            string strengthsText = null;
            string weaknessesText = null;
            if (doc.RootElement.TryGetProperty("strengths", out var str) && str.ValueKind == JsonValueKind.Array)
            {
                var items = new List<string>();
                foreach (var item in str.EnumerateArray()) items.Add(item.GetString());
                if (items.Count > 0) strengthsText = string.Join(", ", items);
            }
            if (doc.RootElement.TryGetProperty("weaknesses", out var weak) && weak.ValueKind == JsonValueKind.Array)
            {
                var items = new List<string>();
                foreach (var item in weak.EnumerateArray()) items.Add(item.GetString());
                if (items.Count > 0) weaknessesText = string.Join(", ", items);
            }
            
            return new ExamFeedbackResult
            {
                Feedback = feedbackText,
                Strengths = strengthsText,
                Weaknesses = weaknessesText
            };
        }

        public async Task AnalyzeCvAsync(
            Guid applicationId, string cvFilePath,
            CleanArchitecture.Core.Entities.JobPosting jobPosting, Guid stageId, Guid cvId)
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
            
            // Fire-and-forget: we don't wait for the analysis to finish here
            try
            {
                await _httpClient.PostAsync("cv/analyze", content);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"CV Analysis trigger failed: {ex.Message}");
            }
        }

        /// <summary>
        /// Calls the AI NLP /backend/extract-job-stats endpoint to extract skills, positions and
        /// locations from a published job posting. Falls back to local text parsing on failure.
        /// </summary>
        public async Task<JobStatsExtractionResult> ExtractJobStatsAsync(
            string jobTitle,
            string requiredSkills,
            string location,
            string responsibilities = null,
            string requiredQualifications = null)
        {
            try
            {
                var payload = new
                {
                    jobTitle = jobTitle,
                    requiredSkills = requiredSkills,
                    location = location,
                    responsibilities = responsibilities,
                    requiredQualifications = requiredQualifications
                };

                var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
                var content = new StringContent(JsonSerializer.Serialize(payload, options), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync("backend/extract-job-stats", content);

                if (!response.IsSuccessStatusCode)
                    return FallbackExtract(jobTitle, requiredSkills, location);

                var responseString = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<JobStatsExtractionResult>(responseString,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                return result ?? FallbackExtract(jobTitle, requiredSkills, location);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Stats] AI extraction failed, using fallback: {ex.Message}");
                return FallbackExtract(jobTitle, requiredSkills, location);
            }
        }

        /// <summary>
        /// Local fallback: parses comma-separated skills and splits location by '/', ',' or '-'.
        /// </summary>
        private static JobStatsExtractionResult FallbackExtract(string jobTitle, string requiredSkills, string location)
        {
            var result = new JobStatsExtractionResult();

            // Skills — split by comma/semicolon
            if (!string.IsNullOrWhiteSpace(requiredSkills))
            {
                result.Skills = new List<string>();
                foreach (var s in requiredSkills.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries))
                {
                    var trimmed = s.Trim();
                    if (!string.IsNullOrWhiteSpace(trimmed) && trimmed.Length <= 60)
                        result.Skills.Add(trimmed);
                }
            }

            // Position — job title
            if (!string.IsNullOrWhiteSpace(jobTitle))
                result.Positions = new List<string> { jobTitle.Trim() };

            // Location — split by '/' or ','
            if (!string.IsNullOrWhiteSpace(location))
            {
                result.Locations = new List<string>();
                foreach (var loc in location.Split(new[] { '/', ',', '-' }, StringSplitOptions.RemoveEmptyEntries))
                {
                    var trimmed = loc.Trim();
                    if (!string.IsNullOrWhiteSpace(trimmed) && trimmed.Length >= 2)
                        result.Locations.Add(trimmed);
                }
            }

            return result;
        }
    }
}
