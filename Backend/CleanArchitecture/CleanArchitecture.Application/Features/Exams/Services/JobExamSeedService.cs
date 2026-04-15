using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CleanArchitecture.Core.DTOs.Email;
using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Core.Settings;
using Microsoft.Extensions.Options;

namespace CleanArchitecture.Core.Features.Exams.Services
{
    /// <summary>
    /// Ensures every JobPosting has exactly one auto-approved mock exam.
    /// Called automatically when a candidate applies to a job.
    /// The exam is job-specific (NOT candidate-specific).
    /// </summary>
    public class JobExamSeedService
    {
        private readonly IGenericRepositoryAsync<Exam> _examRepo;
        private readonly IGenericRepositoryAsync<Question> _questionRepo;
        private readonly IGenericRepositoryAsync<JobPosting> _jobRepo;

        public JobExamSeedService(
            IGenericRepositoryAsync<Exam> examRepo,
            IGenericRepositoryAsync<Question> questionRepo,
            IGenericRepositoryAsync<JobPosting> jobRepo)
        {
            _examRepo = examRepo;
            _questionRepo = questionRepo;
            _jobRepo = jobRepo;
        }

        /// <summary>
        /// Returns the approved exam for this job, creating it if it doesn't exist yet.
        /// </summary>
        public async Task<Exam> EnsureExamExistsForJob(Guid jobId)
        {
            // Check if an approved exam already exists for this job
            var allExams = (List<Exam>)await _examRepo.GetAllAsync();
            var existing = allExams.FirstOrDefault(e => e.JobId == jobId && e.Status == "approved");
            if (existing != null) return existing;

            var jobPosting = await _jobRepo.GetByIdAsync(jobId);
            var examType = DetectExamType(jobPosting?.JobTitle ?? "", jobPosting?.Department ?? "");
            var questions = GetMockQuestions(examType, jobPosting?.JobTitle ?? "Genel");

            // Create and save the exam
            var exam = new Exam
            {
                Id = Guid.NewGuid(),
                JobId = jobId,
                Title = $"{jobPosting?.JobTitle ?? "Pozisyon"} — Değerlendirme Sınavı",
                ExamType = examType,
                SequenceOrder = 1,
                IsMandatory = true,
                Status = "approved",
                TimeLimitMinutes = 45,
                ApprovedAt = DateTime.UtcNow
            };
            await _examRepo.AddAsync(exam);

            // Save questions
            foreach (var q in questions)
            {
                q.ExamId = exam.Id;
                await _questionRepo.AddAsync(q);
            }

            return exam;
        }

        // ── Exam type detection based on job title/department ─────────────────
        private static string DetectExamType(string title, string department)
        {
            var combined = (title + " " + department).ToLowerInvariant();
            if (combined.Contains("yazılım") || combined.Contains("developer") ||
                combined.Contains("software") || combined.Contains("backend") ||
                combined.Contains("frontend") || combined.Contains("fullstack") ||
                combined.Contains("engineer") || combined.Contains("mühendis"))
                return "technical";

            if (combined.Contains("pazarlama") || combined.Contains("marketing") ||
                combined.Contains("satış") || combined.Contains("sales"))
                return "case_study";

            if (combined.Contains("insan") || combined.Contains("hr") ||
                combined.Contains("human resource") || combined.Contains("ik"))
                return "personality";

            return "general";
        }

        // ── Mock questions per exam type ──────────────────────────────────────
        private static List<Question> GetMockQuestions(string examType, string jobTitle)
        {
            return examType switch
            {
                "technical" => GetTechnicalQuestions(),
                "case_study" => GetCaseStudyQuestions(),
                "personality" => GetPersonalityQuestions(),
                _ => GetGeneralQuestions()
            };
        }

        private static List<Question> GetTechnicalQuestions() => new()
        {
            new Question { Id = Guid.NewGuid(), QuestionType = "multiple_choice", Points = 10, OrderIndex = 1,
                QuestionText = "REST API tasarımında idempotent olan HTTP metodları hangileridir?",
                OptionsJson = "[{\"key\":\"A\",\"text\":\"POST ve DELETE\"},{\"key\":\"B\",\"text\":\"GET ve PUT\"},{\"key\":\"C\",\"text\":\"POST ve PATCH\"},{\"key\":\"D\",\"text\":\"GET ve POST\"}]",
                CorrectAnswer = "B" },

            new Question { Id = Guid.NewGuid(), QuestionType = "multiple_choice", Points = 10, OrderIndex = 2,
                QuestionText = "SQL'de bir tablodaki tekrar eden kayıtları kaldırmak için hangi anahtar kelime kullanılır?",
                OptionsJson = "[{\"key\":\"A\",\"text\":\"UNIQUE\"},{\"key\":\"B\",\"text\":\"DISTINCT\"},{\"key\":\"C\",\"text\":\"FILTER\"},{\"key\":\"D\",\"text\":\"REMOVE\"}]",
                CorrectAnswer = "B" },

            new Question { Id = Guid.NewGuid(), QuestionType = "multiple_choice", Points = 10, OrderIndex = 3,
                QuestionText = "Nesne yönelimli programlamada 'encapsulation' kavramı ne anlama gelir?",
                OptionsJson = "[{\"key\":\"A\",\"text\":\"Sınıfların birbirinden miras alması\"},{\"key\":\"B\",\"text\":\"Verilerin ve metodların bir arada gizlenmesi\"},{\"key\":\"C\",\"text\":\"Aynı metodun farklı parametrelerle kullanılması\"},{\"key\":\"D\",\"text\":\"Sınıfların soyut tanımlanması\"}]",
                CorrectAnswer = "B" },

            new Question { Id = Guid.NewGuid(), QuestionType = "true_false", Points = 10, OrderIndex = 4,
                QuestionText = "HTTP 404 hata kodu, sunucunun isteği işleyemediğini (sunucu hatası) ifade eder.",
                OptionsJson = "[{\"key\":\"A\",\"text\":\"Doğru\"},{\"key\":\"B\",\"text\":\"Yanlış\"}]",
                CorrectAnswer = "B" },

            new Question { Id = Guid.NewGuid(), QuestionType = "multiple_choice", Points = 10, OrderIndex = 5,
                QuestionText = "Git'te 'merge' ve 'rebase' arasındaki temel fark nedir?",
                OptionsJson = "[{\"key\":\"A\",\"text\":\"Merge daha hızlı çalışır\"},{\"key\":\"B\",\"text\":\"Rebase commit geçmişini daha temiz gösterir\"},{\"key\":\"C\",\"text\":\"Merge sadece yerel değişiklikler içindir\"},{\"key\":\"D\",\"text\":\"Fark yoktur\"}]",
                CorrectAnswer = "B" },

            new Question { Id = Guid.NewGuid(), QuestionType = "multiple_choice", Points = 15, OrderIndex = 6,
                QuestionText = "Bir web uygulamasında SQL Injection saldırısını önlemek için en etkili yöntem hangisidir?",
                OptionsJson = "[{\"key\":\"A\",\"text\":\"Kullanıcı girdilerini büyük harfe çevirmek\"},{\"key\":\"B\",\"text\":\"Parameterized queries (parametreli sorgular) kullanmak\"},{\"key\":\"C\",\"text\":\"Veritabanını şifrelemek\"},{\"key\":\"D\",\"text\":\"HTTPS kullanmak\"}]",
                CorrectAnswer = "B" },

            new Question { Id = Guid.NewGuid(), QuestionType = "open_ended", Points = 25, OrderIndex = 7,
                QuestionText = "Bir e-ticaret sisteminde ürün stoğunun yanlış azaltılması (race condition) sorununu nasıl çözerdiniz? Kullandığınız yaklaşımı ve kullandığız teknolojileri açıklayın.",
                OptionsJson = null, CorrectAnswer = null },

            new Question { Id = Guid.NewGuid(), QuestionType = "multiple_choice", Points = 10, OrderIndex = 8,
                QuestionText = "Microservices mimarisinde servisler arası iletişimde hangisi asenkron iletişim yöntemidir?",
                OptionsJson = "[{\"key\":\"A\",\"text\":\"REST API\"},{\"key\":\"B\",\"text\":\"gRPC\"},{\"key\":\"C\",\"text\":\"Message Queue (RabbitMQ, Kafka)\"},{\"key\":\"D\",\"text\":\"GraphQL\"}]",
                CorrectAnswer = "C" },
        };

        private static List<Question> GetCaseStudyQuestions() => new()
        {
            new Question { Id = Guid.NewGuid(), QuestionType = "multiple_choice", Points = 10, OrderIndex = 1,
                QuestionText = "Bir ürünün pazar payını artırmak için hangi strateji önceliklendirilmelidir?",
                OptionsJson = "[{\"key\":\"A\",\"text\":\"Fiyat indirimi\"},{\"key\":\"B\",\"text\":\"Müşteri segmentasyonu ve hedefleme\"},{\"key\":\"C\",\"text\":\"Rakip ürünlerin kopyalanması\"},{\"key\":\"D\",\"text\":\"Dağıtım kanallarını daraltmak\"}]",
                CorrectAnswer = "B" },

            new Question { Id = Guid.NewGuid(), QuestionType = "multiple_choice", Points = 10, OrderIndex = 2,
                QuestionText = "SWOT analizinde 'O' harfi neyi temsil eder?",
                OptionsJson = "[{\"key\":\"A\",\"text\":\"Objectives (Hedefler)\"},{\"key\":\"B\",\"text\":\"Opportunities (Fırsatlar)\"},{\"key\":\"C\",\"text\":\"Operations (Operasyonlar)\"},{\"key\":\"D\",\"text\":\"Outcomes (Sonuçlar)\"}]",
                CorrectAnswer = "B" },

            new Question { Id = Guid.NewGuid(), QuestionType = "open_ended", Points = 30, OrderIndex = 3,
                QuestionText = "Yeni bir ürünü pazara sunma sürecinde (Go-to-Market stratejisi) hangi adımları izlerdiniz? Bir örnek üzerinden açıklayın.",
                OptionsJson = null, CorrectAnswer = null },

            new Question { Id = Guid.NewGuid(), QuestionType = "true_false", Points = 10, OrderIndex = 4,
                QuestionText = "CAC (Customer Acquisition Cost), müşteriyi elde tutma maliyetini ifade eder.",
                OptionsJson = "[{\"key\":\"A\",\"text\":\"Doğru\"},{\"key\":\"B\",\"text\":\"Yanlış\"}]",
                CorrectAnswer = "B" },

            new Question { Id = Guid.NewGuid(), QuestionType = "open_ended", Points = 30, OrderIndex = 5,
                QuestionText = "Şirketinizin dijital dönüşüm sürecinde karşılaştığı en büyük engel neydi ve bunu nasıl aştınız? (Deneyiminiz yoksa, teorik bir vaka üzerinden anlatın.)",
                OptionsJson = null, CorrectAnswer = null },
        };

        private static List<Question> GetPersonalityQuestions() => new()
        {
            new Question { Id = Guid.NewGuid(), QuestionType = "multiple_choice", Points = 10, OrderIndex = 1,
                QuestionText = "Ekipte bir çatışma yaşandığında ilk tepkiniz ne olur?",
                OptionsJson = "[{\"key\":\"A\",\"text\":\"Konuyu görmezden gelirim\"},{\"key\":\"B\",\"text\":\"Tarafları bir araya getirip ortak çözüm ararım\"},{\"key\":\"C\",\"text\":\"Yöneticiye hemen bildiririm\"},{\"key\":\"D\",\"text\":\"Kendi görüşümde ısrar ederim\"}]",
                CorrectAnswer = "B" },

            new Question { Id = Guid.NewGuid(), QuestionType = "open_ended", Points = 30, OrderIndex = 2,
                QuestionText = "Kariyer hedefleriniz nelerdir? 5 yıl sonra kendinizi nerede görüyorsunuz?",
                OptionsJson = null, CorrectAnswer = null },

            new Question { Id = Guid.NewGuid(), QuestionType = "multiple_choice", Points = 10, OrderIndex = 3,
                QuestionText = "Baskı altında çalışırken nasıl bir yaklaşım benimsersiniz?",
                OptionsJson = "[{\"key\":\"A\",\"text\":\"Önceliklendirme yaparak adım adım ilerlerim\"},{\"key\":\"B\",\"text\":\"Her şeyi aynı anda yapmaya çalışırım\"},{\"key\":\"C\",\"text\":\"İşi erteleyerek baskı geçene kadar beklerim\"},{\"key\":\"D\",\"text\":\"Yardım istemekten kaçınırım\"}]",
                CorrectAnswer = "A" },

            new Question { Id = Guid.NewGuid(), QuestionType = "open_ended", Points = 30, OrderIndex = 4,
                QuestionText = "Şimdiye kadar aldığınız en zor iş kararı neydi? Bu kararı nasıl aldınız ve sonuçları neler oldu?",
                OptionsJson = null, CorrectAnswer = null },
        };

        private static List<Question> GetGeneralQuestions() => new()
        {
            new Question { Id = Guid.NewGuid(), QuestionType = "multiple_choice", Points = 10, OrderIndex = 1,
                QuestionText = "Türkiye'nin başkenti neresidir?",
                OptionsJson = "[{\"key\":\"A\",\"text\":\"İstanbul\"},{\"key\":\"B\",\"text\":\"İzmir\"},{\"key\":\"C\",\"text\":\"Ankara\"},{\"key\":\"D\",\"text\":\"Bursa\"}]",
                CorrectAnswer = "C" },

            new Question { Id = Guid.NewGuid(), QuestionType = "multiple_choice", Points = 10, OrderIndex = 2,
                QuestionText = "Etkili iletişimin en temel unsuru nedir?",
                OptionsJson = "[{\"key\":\"A\",\"text\":\"Sürekli konuşmak\"},{\"key\":\"B\",\"text\":\"Aktif dinleme\"},{\"key\":\"C\",\"text\":\"Teknik terimler kullanmak\"},{\"key\":\"D\",\"text\":\"Hızlı yanıt vermek\"}]",
                CorrectAnswer = "B" },

            new Question { Id = Guid.NewGuid(), QuestionType = "true_false", Points = 10, OrderIndex = 3,
                QuestionText = "Ekip çalışması, bireysel çalışmadan her zaman daha verimsizdir.",
                OptionsJson = "[{\"key\":\"A\",\"text\":\"Doğru\"},{\"key\":\"B\",\"text\":\"Yanlış\"}]",
                CorrectAnswer = "B" },

            new Question { Id = Guid.NewGuid(), QuestionType = "open_ended", Points = 30, OrderIndex = 4,
                QuestionText = "Bu pozisyon için neden başvurdunuz? Bu şirkette sizi en çok heyecanlandıran nedir?",
                OptionsJson = null, CorrectAnswer = null },

            new Question { Id = Guid.NewGuid(), QuestionType = "multiple_choice", Points = 10, OrderIndex = 5,
                QuestionText = "Bir projeyi zamanında tamamlamak için en kritik faktör hangisidir?",
                OptionsJson = "[{\"key\":\"A\",\"text\":\"Uzun saatler çalışmak\"},{\"key\":\"B\",\"text\":\"Net hedefler ve düzenli takip\"},{\"key\":\"C\",\"text\":\"Mümkün olduğunca az toplantı yapmak\"},{\"key\":\"D\",\"text\":\"Her görevi kendiniz yapmak\"}]",
                CorrectAnswer = "B" },
        };
    }
}
