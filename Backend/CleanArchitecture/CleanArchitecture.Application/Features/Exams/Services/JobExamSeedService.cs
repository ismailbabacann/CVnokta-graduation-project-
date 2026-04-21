using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Application.Interfaces;
using CleanArchitecture.Application.Features.JobPostings.Queries.GenerateEnglishExam;

namespace CleanArchitecture.Core.Features.Exams.Services
{
    /// <summary>
    /// Ensures every JobPosting has exactly 2 auto-approved exams:
    ///   Stage 1 (SequenceOrder = 1): English / Language Assessment
    ///   Stage 2 (SequenceOrder = 2): Technical / Role-Specific
    ///
    /// Called automatically when a candidate applies to a job.
    /// PassThreshold is taken from JobPosting.PipelinePassThreshold.
    /// </summary>
    public class JobExamSeedService
    {
        private readonly IGenericRepositoryAsync<Exam> _examRepo;
        private readonly IGenericRepositoryAsync<Question> _questionRepo;
        private readonly IGenericRepositoryAsync<JobPosting> _jobRepo;
        private readonly IAiJobPostingGenerationService _aiService;

        public JobExamSeedService(
            IGenericRepositoryAsync<Exam> examRepo,
            IGenericRepositoryAsync<Question> questionRepo,
            IGenericRepositoryAsync<JobPosting> jobRepo,
            IAiJobPostingGenerationService aiService)
        {
            _examRepo     = examRepo;
            _questionRepo = questionRepo;
            _jobRepo      = jobRepo;
            _aiService    = aiService;
        }

        // ── Public API ──────────────────────────────────────────────────────
        /// <summary>Returns the Stage 1 (English) exam, creating it if needed.</summary>
        public Task<Exam> EnsureEnglishExam(Guid jobId) => EnsureExam(jobId, 1);

        /// <summary>Returns the Stage 2 (Technical) exam, creating it if needed.</summary>
        public Task<Exam> EnsureTechnicalExam(Guid jobId) => EnsureExam(jobId, 2);

        /// <summary>
        /// Returns the Stage 1 (English) exam for this job,
        /// creating it (and saving questions) if it doesn't exist yet.
        /// </summary>
        public async Task<Exam> EnsureEnglishExamForJob(Guid jobId) => await EnsureExam(jobId, 1);

        // ── Internal ────────────────────────────────────────────────────────
        private async Task<Exam> EnsureExam(Guid jobId, int stage)
        {
            var allExams = (List<Exam>)await _examRepo.GetAllAsync();
            var existing = allExams.FirstOrDefault(e =>
                e.JobId == jobId && e.SequenceOrder == stage && e.Status == "approved");
            if (existing != null) return existing;

            var job       = await _jobRepo.GetByIdAsync(jobId);
            var threshold = job?.PipelinePassThreshold ?? 70;
            var jobTitle  = job?.JobTitle ?? "Pozisyon";
            var techType  = DetectTechType(job?.JobTitle ?? "", job?.Department ?? "");
            
            // STRICT ENFORCEMENT: Stage 1 is ALWAYS English
            if (stage == 1)
            {
                var existingEnglish = allExams.FirstOrDefault(e => e.JobId == jobId && (e.SequenceOrder == 1 || e.ExamType == "english") && e.Status == "approved");
                if (existingEnglish != null) return existingEnglish;
            }

            Exam exam;

            if (stage == 1)
            {
                exam = new Exam
                {
                    Id              = Guid.NewGuid(),
                    JobId           = jobId,
                    Title           = $"{jobTitle} — İngilizce Dil Değerlendirmesi",
                    ExamType        = "english",
                    SequenceOrder   = 1,
                    IsMandatory     = true,
                    Status          = "approved",
                    TimeLimitMinutes = 30,
                    PassThreshold   = threshold,
                    ApprovedAt      = DateTime.UtcNow
                };
            }
            else
            {
                exam = new Exam
                {
                    Id              = Guid.NewGuid(),
                    JobId           = jobId,
                    Title           = $"{jobTitle} — Teknik Değerlendirme Sınavı",
                    ExamType        = techType,
                    SequenceOrder   = 2,
                    IsMandatory     = true,
                    Status          = "approved",
                    TimeLimitMinutes = 45,
                    PassThreshold   = threshold,
                    ApprovedAt      = DateTime.UtcNow
                };
            }

            await _examRepo.AddAsync(exam);

            // Target 50% AI / 50% DB Pool
            int targetTotal = stage == 1 ? 10 : 10; // Standard 10 questions per exam
            int aiTarget = 5;
            int poolTarget = 5;

            List<Question> finalQuestions = new List<Question>();

            // 1. Try to get questions from DB Pool
            var poolQuestions = await GetQuestionsFromPool(exam.ExamType, poolTarget);
            finalQuestions.AddRange(poolQuestions);

            // 2. Adjust AI target if pool was smaller than expected
            int remainingNeeded = targetTotal - finalQuestions.Count;
            
            // 3. Try AI-generated questions
            try
            {
                if (stage == 1)
                {
                    var examDto = await _aiService.GenerateEnglishExamAsync(
                        $"ENGLISH_PROFICIENCY_TEST: {jobTitle}");
                    var aiQuestions = ConvertAiQuestionsToEntities(examDto?.Questions);
                    if (aiQuestions != null)
                        finalQuestions.AddRange(aiQuestions.Take(remainingNeeded));
                }
                else
                {
                    var examDto = await _aiService.GenerateEnglishExamAsync(
                        $"TECHNICAL_ASSESSMENT: {jobTitle} ({techType})");
                    var aiQuestions = ConvertAiQuestionsToEntities(examDto?.Questions);
                    if (aiQuestions != null)
                        finalQuestions.AddRange(aiQuestions.Take(remainingNeeded));
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[JobExamSeedService] AI generation failed: {ex.Message}");
            }

            // 4. Final Fallback: If we still don't have enough questions
            if (finalQuestions.Count < targetTotal)
            {
                var fallback = stage == 1 ? GetEnglishQuestions() : GetTechnicalQuestions(techType);
                foreach (var fq in fallback)
                {
                    if (finalQuestions.Count >= targetTotal) break;
                    if (!finalQuestions.Any(q => q.QuestionText == fq.QuestionText))
                        finalQuestions.Add(fq);
                }
            }

            // Shuffle and assign IDs/ExamId/Order
            var shuffled = finalQuestions.OrderBy(x => Guid.NewGuid()).Take(targetTotal).ToList();
            for (int i = 0; i < shuffled.Count; i++)
            {
                var q = shuffled[i];
                q.Id = Guid.NewGuid();
                q.ExamId = exam.Id;
                q.OrderIndex = i + 1;
                await _questionRepo.AddAsync(q);
            }

            return exam;
        }

        // ── AI question converter ────────────────────────────────────────────────
        private static List<Question> ConvertAiQuestionsToEntities(List<GeneratedExamQuestionDto> dtos)
        {
            if (dtos == null || dtos.Count == 0) return null;
            var result = new List<Question>();
            for (int i = 0; i < dtos.Count; i++)
            {
                var dto = dtos[i];
                if (string.IsNullOrWhiteSpace(dto.QuestionText)) continue;

                // Determine correct answer key (A/B/C/D) by matching correctAnswer text to options
                var opts = dto.Options ?? new List<string>();
                string correctKey = "A";
                char[] keys = { 'A', 'B', 'C', 'D' };
                for (int k = 0; k < opts.Count && k < keys.Length; k++)
                {
                    if (string.Equals(opts[k].Trim(), dto.CorrectAnswer?.Trim(), StringComparison.OrdinalIgnoreCase))
                    {
                        correctKey = keys[k].ToString();
                        break;
                    }
                }

                // Build OptionsJson
                var optionParts = new List<string>();
                for (int k = 0; k < opts.Count && k < keys.Length; k++)
                {
                    if (!string.IsNullOrWhiteSpace(opts[k]))
                        optionParts.Add($"{{\"key\":\"{keys[k]}\",\"text\":\"{Esc(opts[k])}\"}}");
                }
                
                // HARDENING: If 0 or 1 options for a MC question, skip it
                if (optionParts.Count < 2) continue;

                var optionsJson = "[" + string.Join(",", optionParts) + "]";

                result.Add(new Question
                {
                    Id           = Guid.NewGuid(),
                    OrderIndex   = i + 1,
                    Points       = 10,
                    QuestionText = dto.QuestionText,
                    QuestionType = "multiple_choice",
                    CorrectAnswer = correctKey,
                    OptionsJson  = optionsJson
                });
            }
            return result;
        }

        private async Task<List<Question>> GetQuestionsFromPool(string examType, int count)
        {
            var allQuestions = (List<Question>)await _questionRepo.GetAllAsync();
            var pool = allQuestions
                .Where(q => q.Exam != null && q.Exam.ExamType == examType && q.Exam.Status == "approved")
                .OrderBy(x => Guid.NewGuid()) // Random shuffle
                .ToList();

            // If Exam navigation is null (lazy loading), we might need to fetch exams first or join
            if (pool.Count == 0)
            {
                // Fallback to searching by any question that might have text matching type if needed, 
                // but usually the ExamId is enough if we join.
                var allExams = (List<Exam>)await _examRepo.GetAllAsync();
                var targets  = allExams.Where(e => e.ExamType == examType && e.Status == "approved").Select(e => e.Id).ToList();
                pool = allQuestions
                    .Where(q => targets.Contains(q.ExamId))
                    .OrderBy(x => Guid.NewGuid())
                    .Take(count)
                    .Select(q => new Question {
                        QuestionText = q.QuestionText,
                        QuestionType = q.QuestionType,
                        QuestionCategory = q.QuestionCategory,
                        OptionsJson = q.OptionsJson,
                        CorrectAnswer = q.CorrectAnswer,
                        Points = q.Points,
                        MediaUrl = q.MediaUrl
                    })
                    .ToList();
            }

            return pool.Take(count).ToList();
        }

        // ── Tech type detection ─────────────────────────────────────────────
        private static string DetectTechType(string title, string dept)
        {
            var s = (title + " " + dept).ToLowerInvariant();
            if (s.Contains("yazılım") || s.Contains("developer") || s.Contains("software") ||
                s.Contains("backend")  || s.Contains("frontend")  || s.Contains("fullstack") ||
                s.Contains("engineer") || s.Contains("mühendis"))
                return "technical";
            if (s.Contains("pazarlama") || s.Contains("marketing") ||
                s.Contains("satış")     || s.Contains("sales"))
                return "case_study";
            if (s.Contains("insan") || s.Contains("hr") || s.Contains("ik"))
                return "personality";
            return "general";
        }

        // ══════════════════════════════════════════════════════════════════════
        // STAGE 1 — İngilizce Sınavı (30 soru, 100 puan)
        // ══════════════════════════════════════════════════════════════════════
        private static List<Question> GetEnglishQuestions() => new()
        {
            Mc(1,  10, "Which sentence is grammatically correct?",
                "A", "He don't like coffee.",
                      "She doesn't likes coffee.",
                      "They don't like coffee.",
                      "We doesn't like coffee."),
            Mc(2,  10, "Choose the correct form: 'If I _____ rich, I would travel the world.'",
                "B", "am",
                      "were",
                      "being",
                      "be"),
            Mc(3,  10, "What is the synonym of 'eloquent'?",
                "C", "Quiet",
                      "Aggressive",
                      "Articulate",
                      "Confused"),
            Mc(4,  10, "Select the correct passive voice: 'The manager ___ the report yesterday.'",
                "A", "reviewed",
                      "was reviewed",
                      "has reviewed",
                      "is reviewing"),
            Mc(5,  10, "Which word best completes the sentence: 'Her performance was _____ than expected.'",
                "B", "good",
                      "better",
                      "best",
                      "well"),
            TF(6,  10, "'Much' is used with countable nouns.", "B"),
            Mc(7,  10, "Choose the correct preposition: 'She is good ___ solving problems.'",
                "C", "in",
                      "on",
                      "at",
                      "for"),
            Mc(8,  10, "What does 'meticulous' mean?",
                "A", "Very careful and precise",
                      "Very fast",
                      "Very loud",
                      "Very creative"),
            TF(9,  10, "The present perfect tense is formed with 'have/has + past participle'.", "A"),
            OE(10, 20, "Describe your professional strengths and how they would contribute to this role. (Write 3-5 sentences in English.)"),
        };

        // ══════════════════════════════════════════════════════════════════════
        // STAGE 2 — Teknik Sınavlar
        // ══════════════════════════════════════════════════════════════════════
        private static List<Question> GetTechnicalQuestions(string type) => type switch
        {
            "case_study"  => GetCaseStudyQuestions(),
            "personality" => GetPersonalityQuestions(),
            _             => GetSoftwareTechQuestions()
        };

        private static List<Question> GetSoftwareTechQuestions() => new()
        {
            Mc(1, 10, "REST API tasarımında idempotent olan HTTP metodları hangileridir?",
                "B", "POST ve DELETE",
                      "GET ve PUT",
                      "POST ve PATCH",
                      "GET ve POST"),
            Mc(2, 10, "SQL'de tekrar eden kayıtları kaldırmak için hangi anahtar kelime kullanılır?",
                "B", "UNIQUE", "DISTINCT", "FILTER", "REMOVE"),
            TF(3, 10, "HTTP 404, sunucu taraflı bir hata kodudur (sunucu hatası).", "B"),
            Mc(4, 10, "Nesne Yönelimli Programlamada 'encapsulation' ne anlama gelir?",
                "B", "Sınıfların miras alması",
                      "Verinin ve metodların bir arada gizlenmesi",
                      "Soyut sınıf tanımlama",
                      "Aynı metodun farklı parametrelerle kullanılması"),
            Mc(5, 10, "Git'te 'rebase' ne yapar?",
                "B", "Branch'i siler",
                      "Commit geçmişini temizleyerek uygular",
                      "Remote'a push eder",
                      "Merge conflict'i çözer"),
            Mc(6, 10, "Bir web uygulamasında SQL Injection'ı önlemenin en etkili yolu?",
                "B", "HTTPS kullanmak",
                      "Parametreli sorgular kullanmak",
                      "Veritabanını şifrelemek",
                      "Girişi büyük harfe çevirmek"),
            Mc(7, 10, "Microservices mimarisinde asenkron iletişim nasıl sağlanır?",
                "C", "REST API", "gRPC", "Message Queue (RabbitMQ/Kafka)", "GraphQL"),
            TF(8, 10, "SOLID prensiplerinde 'S', Single Responsibility Principle'ı temsil eder.", "A"),
            OE(9, 30, "Bir e-ticaret sisteminde ürün stoğunun yanlış azaltılması (race condition) sorununu nasıl çözerdiniz? Kullandığınız yaklaşımı ve teknolojileri açıklayın."),
        };

        private static List<Question> GetCaseStudyQuestions() => new()
        {
            Mc(1, 10, "SWOT analizinde 'O' harfi neyi temsil eder?",
                "B", "Objectives", "Opportunities", "Operations", "Outcomes"),
            Mc(2, 10, "CAC (Customer Acquisition Cost) ne anlama gelir?",
                "A", "Yeni müşteri kazanım maliyeti",
                      "Müşteriyi elde tutma maliyeti",
                      "Ürün maliyeti",
                      "Operasyonel maliyet"),
            TF(3, 10, "NPS (Net Promoter Score) yükseldikçe müşteri memnuniyeti düşer.", "B"),
            Mc(4, 10, "Pazar payını artırmak için önceliklendirilecek strateji?",
                "B", "Fiyat indirimi",
                      "Müşteri segmentasyonu ve hedefleme",
                      "Rakip ürünlerin kopyalanması",
                      "Dağıtım kanallarını daraltmak"),
            OE(5, 35, "Yeni bir ürünü pazara sunma sürecinde (Go-to-Market) hangi adımları izlerdiniz? Bir örnek üzerinden açıklayın."),
            OE(6, 35, "Şirketinizin dijital dönüşüm sürecinde karşılaştığı en büyük engel neydi ve bunu nasıl aştınız?"),
        };

        private static List<Question> GetPersonalityQuestions() => new()
        {
            Mc(1, 10, "Ekipte çatışma yaşandığında ilk tepkiniz ne olur?",
                "B", "Görmezden gelirim",
                      "Tarafları bir araya getirip ortak çözüm ararım",
                      "Yöneticiye bildiririm",
                      "Kendi görüşümde ısrar ederim"),
            Mc(2, 10, "Baskı altında nasıl çalışırsınız?",
                "A", "Önceliklendirip adım adım ilerlerim",
                      "Her şeyi aynı anda yapmaya çalışırım",
                      "İşi erteleyerek beklerim",
                      "Yardım istemekten kaçınırım"),
            TF(3, 10, "Geri bildirim almak kişisel gelişim için fırsattır.", "A"),
            OE(4, 35, "Kariyer hedefleriniz nelerdir? 5 yıl sonra kendinizi nerede görüyorsunuz?"),
            OE(5, 35, "Şimdiye kadar aldığınız en zor iş kararı neydi? Bu kararı nasıl aldınız?"),
        };

        // ── Question factory helpers ─────────────────────────────────────────────
        private static Question Mc(int order, int pts, string text, string correct,
            string a, string b, string c, string d) => new()
        {
            Id = Guid.NewGuid(), OrderIndex = order, Points = pts,
            QuestionText = text, QuestionType = "multiple_choice",
            CorrectAnswer = correct,
            OptionsJson = $"[{{\"key\":\"A\",\"text\":\"{Esc(a)}\"}},{{\"key\":\"B\",\"text\":\"{Esc(b)}\"}},{{\"key\":\"C\",\"text\":\"{Esc(c)}\"}},{{\"key\":\"D\",\"text\":\"{Esc(d)}\"}}]"
        };

        private static Question TF(int order, int pts, string text, string correct) => new()
        {
            Id = Guid.NewGuid(), OrderIndex = order, Points = pts,
            QuestionText = text, QuestionType = "true_false",
            CorrectAnswer = correct,
            OptionsJson = "[{\"key\":\"A\",\"text\":\"Doğru\"},{\"key\":\"B\",\"text\":\"Yanlış\"}]"
        };

        private static Question OE(int order, int pts, string text) => new()
        {
            Id = Guid.NewGuid(), OrderIndex = order, Points = pts,
            QuestionText = text, QuestionType = "open_ended",
            CorrectAnswer = null, OptionsJson = null
        };

        private static string Esc(string s) => s.Replace("\"", "\\\"").Replace("'", "\\'");
    }
}
