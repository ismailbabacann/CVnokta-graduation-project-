using System.Threading.Tasks;
using CleanArchitecture.Application.Features.JobPostings.Queries.GenerateJobPostingDetails;
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
    }
}
