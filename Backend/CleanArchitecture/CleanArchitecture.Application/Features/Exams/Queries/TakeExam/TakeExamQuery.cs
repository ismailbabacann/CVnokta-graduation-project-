using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;

namespace CleanArchitecture.Core.Features.Exams.Queries.TakeExam
{
    // ── Response DTOs ─────────────────────────────────────────────────────────

    public class TakeExamQuestionDto
    {
        public Guid QuestionId   { get; set; }
        public string QuestionText  { get; set; }
        public string QuestionType  { get; set; }
        /// <summary>Options JSON for MC/TF; null for open_ended</summary>
        public string OptionsJson   { get; set; }
        public int Points           { get; set; }
        public int OrderIndex       { get; set; }
        // NOTE: CorrectAnswer is intentionally excluded from this DTO
    }

    public class TakeExamResponse
    {
        public Guid AssignmentId        { get; set; }
        public string ExamTitle         { get; set; }
        public string ExamType          { get; set; }
        public string SequenceInfo      { get; set; }
        public int? TimeLimitMinutes    { get; set; }
        public DateTime? StartedAt      { get; set; }
        public DateTime? ExpiresAt      { get; set; }
        public List<TakeExamQuestionDto> Questions { get; set; } = new();

        /// <summary>
        /// Single-use enforcement: true when the candidate already submitted this exam.
        /// Frontend shows an "already completed" screen instead of the exam.
        /// </summary>
        public bool AlreadySubmitted   { get; set; }

        /// <summary>When was the exam submitted (for the "already completed" screen).</summary>
        public DateTime? SubmittedAt   { get; set; }
    }

    // ── Query ─────────────────────────────────────────────────────────────────

    /// <summary>
    /// GET /api/v1/exam/take/{token}
    /// Candidate opens an exam via token. Marks the assignment as in_progress.
    /// Returns questions WITHOUT correct answers.
    /// If already submitted → returns AlreadySubmitted = true (no exception).
    /// Each link can only be used ONCE to take the exam.
    /// </summary>
    public class TakeExamQuery : IRequest<TakeExamResponse>
    {
        public string Token { get; set; }
    }

    // ── Handler ───────────────────────────────────────────────────────────────

    public class TakeExamQueryHandler : IRequestHandler<TakeExamQuery, TakeExamResponse>
    {
        private readonly IGenericRepositoryAsync<CandidateExamAssignment> _assignmentRepo;
        private readonly IGenericRepositoryAsync<Exam>     _examRepo;
        private readonly IGenericRepositoryAsync<Question> _questionRepo;

        public TakeExamQueryHandler(
            IGenericRepositoryAsync<CandidateExamAssignment> assignmentRepo,
            IGenericRepositoryAsync<Exam>     examRepo,
            IGenericRepositoryAsync<Question> questionRepo)
        {
            _assignmentRepo = assignmentRepo;
            _examRepo       = examRepo;
            _questionRepo   = questionRepo;
        }

        public async Task<TakeExamResponse> Handle(TakeExamQuery request, CancellationToken cancellationToken)
        {
            // 1. Token → assignment
            var allAssignments = (List<CandidateExamAssignment>)await _assignmentRepo.GetAllAsync();
            var assignment = allAssignments.FirstOrDefault(a => a.Token == request.Token)
                ?? throw new Exception("Geçersiz sınav tokeni.");

            // 2. SINGLE-USE: Eğer sınav zaten gönderildiyse → hata değil, özel yanıt
            if (assignment.Status == "submitted")
            {
                var completedExam = await _examRepo.GetByIdAsync(assignment.ExamId);
                return new TakeExamResponse
                {
                    AssignmentId     = assignment.Id,
                    ExamTitle        = completedExam?.Title ?? "Sınav",
                    ExamType         = completedExam?.ExamType ?? "general",
                    AlreadySubmitted = true,
                    SubmittedAt      = assignment.SubmittedAt,
                    Questions        = new List<TakeExamQuestionDto>()
                };
            }

            // 3. Süresi dolmuş mu?
            if (assignment.ExpiresAt.HasValue && assignment.ExpiresAt.Value < DateTime.UtcNow)
                throw new Exception("Bu sınav linkinin süresi dolmuştur (72 saat).");

            // 4. Status ilerlet: pending → opened → in_progress
            var now = DateTime.UtcNow;
            if (assignment.Status == "pending")
            {
                assignment.Status   = "in_progress"; // Direkt in_progress — linke tıklandı = başladı
                assignment.OpenedAt  = now;
                assignment.StartedAt = now;
                await _assignmentRepo.UpdateAsync(assignment);
            }
            else if (assignment.Status == "opened")
            {
                assignment.Status    = "in_progress";
                assignment.StartedAt = now;
                await _assignmentRepo.UpdateAsync(assignment);
            }

            // 5. Sınav ve soruları yükle
            var exam = await _examRepo.GetByIdAsync(assignment.ExamId)
                ?? throw new Exception("Sınav bulunamadı.");

            var allQuestions = (List<Question>)await _questionRepo.GetAllAsync();
            var questions = allQuestions
                .Where(q => q.ExamId == exam.Id)
                .OrderBy(q => q.OrderIndex)
                .Select(q => new TakeExamQuestionDto
                {
                    QuestionId   = q.Id,
                    QuestionText = q.QuestionText,
                    QuestionType = q.QuestionType,
                    OptionsJson  = q.OptionsJson,
                    Points       = q.Points,
                    OrderIndex   = q.OrderIndex
                })
                .ToList();

            // 6. Sequence info
            var candidateExams = allAssignments
                .Where(a => a.CandidateId == assignment.CandidateId && a.JobId == assignment.JobId)
                .OrderBy(a => a.Created)
                .ToList();
            int totalExams     = candidateExams.Count;
            int thisExamIndex  = candidateExams.FindIndex(a => a.Id == assignment.Id) + 1;
            string sequenceInfo = totalExams > 1
                ? $"Aşama {thisExamIndex}/{totalExams} — {(exam.ExamType == "english" ? "İngilizce Değerlendirmesi" : "Teknik Değerlendirme")}"
                : null;

            return new TakeExamResponse
            {
                AssignmentId     = assignment.Id,
                ExamTitle        = exam.Title,
                ExamType         = exam.ExamType,
                SequenceInfo     = sequenceInfo,
                TimeLimitMinutes = exam.TimeLimitMinutes,
                StartedAt        = assignment.StartedAt ?? now,
                ExpiresAt        = assignment.ExpiresAt,
                AlreadySubmitted = false,
                Questions        = questions
            };
        }
    }
}
