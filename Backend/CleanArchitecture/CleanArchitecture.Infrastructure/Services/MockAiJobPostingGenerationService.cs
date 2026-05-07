using System.Threading.Tasks;
using CleanArchitecture.Application.Features.JobPostings.Queries.GenerateJobPostingDetails;
using CleanArchitecture.Application.Features.JobPostings.Queries.GenerateEnglishExam;
using CleanArchitecture.Application.Interfaces;

namespace CleanArchitecture.Infrastructure.Services
{
    public class MockAiJobPostingGenerationService : IAiJobPostingGenerationService
    {
        public Task<GeneratedJobPostingDto> GenerateJobPostingAsync(string applicationContext)
        {
            // Placeholder: This is a mock implementation.
            // In the real implementation, you would make an HTTP call to your exterior AI service
            // passing the `applicationContext` string and deserializing the response into GeneratedJobPostingDto.

            var dto = new GeneratedJobPostingDto
            {
                JobTitle = "Generated AI Backend Developer",
                Department = "Engineering",
                Location = "Istanbul",
                WorkType = "FullTime",
                WorkModel = "Hybrid",
                AboutCompany = "Bu metin yapay zeka tarafından oluşturulmuş varsayılan şirket tanıtımıdır.",
                AboutRole = "Bu rol için yapay zeka tarafından üretilmiş varsayılan açıklama alanı.",
                Responsibilities = "<ul><li>Yapay zeka modellerini sisteme entegre etmek.</li><li>Clean Architecture ile uygun servisler yazmak.</li></ul>",
                RequiredQualifications = "<ul><li>C# ve .NET Core Core tecrübesi.</li><li>Yapay zeka prompt engineering bilgisi.</li></ul>",
                RequiredSkills = "C#, .NET, WebApi",
                SalaryMin = 50000,
                SalaryMax = 80000,
                TotalPositions = 1,
                Benefits = "Özel Sağlık Sigortası, Yemek Kartı, Evden Çalışma Desteği"
            };

            return Task.FromResult(dto);
        }

        public Task<GeneratedExamDto> GenerateEnglishExamAsync(string testContext)
        {
            var exam = new GeneratedExamDto
            {
                Title = "Yazılım Geliştirici İngilizce Testi",
                Description = "Adayların mesleki terimleri ve temel iletişim becerilerini ölçmek için yapay zeka tarafından oluşturulmuş 3 soruluk örnek test.",
                Questions = new System.Collections.Generic.List<GeneratedExamQuestionDto>
                {
                    new GeneratedExamQuestionDto
                    {
                        QuestionText = "Which keyword is used to handle exceptions in C#?",
                        Options = new System.Collections.Generic.List<string> { "try-catch", "throw-get", "handle-error", "catch-finally" },
                        CorrectAnswer = "try-catch"
                    },
                    new GeneratedExamQuestionDto
                    {
                        QuestionText = "What does API stand for in software engineering?",
                        Options = new System.Collections.Generic.List<string> { "Application Protocol Interface", "Application Programming Interface", "Auto Processing Interface", "Automated Program Interface" },
                        CorrectAnswer = "Application Programming Interface"
                    },
                    new GeneratedExamQuestionDto
                    {
                        QuestionText = "Select the correct sentence:",
                        Options = new System.Collections.Generic.List<string> { "I has finished my project.", "I have finished my project.", "I having finished my project.", "I finish my project yesterday." },
                        CorrectAnswer = "I have finished my project."
                    }
                }
            };

            return Task.FromResult(exam);
        }

        public Task<ExamFeedbackResult> GetExamFeedbackAsync(System.Guid applicationId, string jobTitle, int totalQuestions, int correctAnswers, decimal score, bool passed, System.Collections.Generic.List<CleanArchitecture.Core.Features.Exams.Commands.SubmitExam.QuestionResultDto> results)
        {
            return Task.FromResult(new ExamFeedbackResult
            {
                Feedback = "Mock AI Feedback: Genel olarak iyi ancak bazı teknik konularda gelişim gerekli.",
                Strengths = "Temel programlama kavramları, problem çözme yaklaşımı",
                Weaknesses = "İleri düzey algoritmalar, sistem tasarımı"
            });
        }

        public Task AnalyzeCvAsync(System.Guid applicationId, string cvFilePath, CleanArchitecture.Core.Entities.JobPosting jobPosting, System.Guid stageId, System.Guid cvId)
        {
            // Do nothing in mock
            return Task.CompletedTask;
        }

        public Task<JobStatsExtractionResult> ExtractJobStatsAsync(string jobTitle, string requiredSkills, string location, string responsibilities = null, string requiredQualifications = null)
        {
            var result = new JobStatsExtractionResult();
            
            // Mock skills
            if (!string.IsNullOrWhiteSpace(requiredSkills))
            {
                foreach (var s in requiredSkills.Split(new[] { ',', ';' }, System.StringSplitOptions.RemoveEmptyEntries))
                {
                    result.Skills.Add(s.Trim());
                }
            }
            else
            {
                result.Skills.AddRange(new[] { "C#", ".NET Core", "SQL Server" });
            }

            // Mock position
            result.Positions.Add(!string.IsNullOrWhiteSpace(jobTitle) ? jobTitle.Trim() : "Backend Developer");

            // Mock location
            result.Locations.Add(!string.IsNullOrWhiteSpace(location) ? location.Split('/')[0].Trim() : "Istanbul");

            return Task.FromResult(result);
        }
    }
}
