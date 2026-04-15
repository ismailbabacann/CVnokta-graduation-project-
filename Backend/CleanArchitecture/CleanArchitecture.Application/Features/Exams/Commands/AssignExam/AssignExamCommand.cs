using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CleanArchitecture.Core.DTOs.Email;
using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;

namespace CleanArchitecture.Core.Features.Exams.Commands.AssignExam
{
    // ── Command ────────────────────────────────────────────────────────────────

    /// <summary>
    /// POST /api/v1/exam/assign
    /// Assigns N exams to M candidates in a single call.
    /// Generates one unique token per (candidate × exam) pair.
    /// </summary>
    public class AssignExamCommand : IRequest<AssignExamResponse>
    {
        public Guid JobId { get; set; }
        public List<Guid> CandidateIds { get; set; } = new List<Guid>();
        public List<Guid> ExamIds { get; set; } = new List<Guid>();

        /// <summary>Token expiry window in hours. Default: 168 (7 days)</summary>
        public int ExpiresInHours { get; set; } = 168;

        public bool SendNotification { get; set; } = true;

        /// <summary>email | (future: sms, push)</summary>
        public string NotificationChannel { get; set; } = "email";
    }

    // ── Response ───────────────────────────────────────────────────────────────

    public class AssignmentItemDto
    {
        public Guid AssignmentId { get; set; }
        public Guid CandidateId { get; set; }
        public Guid ExamId { get; set; }
        public string Token { get; set; }
        public string ExamUrl { get; set; }
        public DateTime ExpiresAt { get; set; }
        public bool NotificationSent { get; set; }
    }

    public class SkippedAssignmentDto
    {
        public Guid CandidateId { get; set; }
        public Guid ExamId { get; set; }
        public string Reason { get; set; }
    }

    public class AssignExamResponse
    {
        public Guid BatchId { get; set; }
        public int TotalAssignmentsCreated { get; set; }
        public List<AssignmentItemDto> Assignments { get; set; } = new List<AssignmentItemDto>();
        public List<SkippedAssignmentDto> Skipped { get; set; } = new List<SkippedAssignmentDto>();
    }

    // ── Handler ────────────────────────────────────────────────────────────────

    public class AssignExamCommandHandler : IRequestHandler<AssignExamCommand, AssignExamResponse>
    {
        private readonly IGenericRepositoryAsync<CandidateExamAssignment> _assignmentRepo;
        private readonly IGenericRepositoryAsync<Exam> _examRepo;
        private readonly IGenericRepositoryAsync<CandidateProfile> _candidateRepo;
        private readonly IExamTokenService _tokenService;
        private readonly IEmailService _emailService;

        public AssignExamCommandHandler(
            IGenericRepositoryAsync<CandidateExamAssignment> assignmentRepo,
            IGenericRepositoryAsync<Exam> examRepo,
            IGenericRepositoryAsync<CandidateProfile> candidateRepo,
            IExamTokenService tokenService,
            IEmailService emailService)
        {
            _assignmentRepo = assignmentRepo;
            _examRepo = examRepo;
            _candidateRepo = candidateRepo;
            _tokenService = tokenService;
            _emailService = emailService;
        }

        public async Task<AssignExamResponse> Handle(AssignExamCommand request, CancellationToken cancellationToken)
        {
            var batchId = Guid.NewGuid();
            var expiresAt = DateTime.UtcNow.AddHours(request.ExpiresInHours);
            var response = new AssignExamResponse { BatchId = batchId };

            // Load existing assignments to detect duplicates
            var allAssignments = (List<CandidateExamAssignment>)await _assignmentRepo.GetAllAsync();

            // Group assignments by candidate for consolidated email per candidate
            var candidateAssignmentMap = new Dictionary<Guid, List<(CandidateExamAssignment assignment, Exam exam)>>();

            foreach (var candidateId in request.CandidateIds)
            {
                foreach (var examId in request.ExamIds)
                {
                    // Duplicate check
                    bool alreadyAssigned = allAssignments.Any(a =>
                        a.CandidateId == candidateId && a.ExamId == examId);

                    if (alreadyAssigned)
                    {
                        response.Skipped.Add(new SkippedAssignmentDto
                        {
                            CandidateId = candidateId,
                            ExamId = examId,
                            Reason = "already_assigned"
                        });
                        continue;
                    }

                    var token = _tokenService.GenerateToken(candidateId, examId);

                    var assignment = new CandidateExamAssignment
                    {
                        Id = Guid.NewGuid(),
                        CandidateId = candidateId,
                        ExamId = examId,
                        JobId = request.JobId,
                        Token = token,
                        AssignmentBatchId = batchId,
                        Status = "pending",
                        ExpiresAt = expiresAt,
                        SentAt = request.SendNotification ? DateTime.UtcNow : (DateTime?)null
                    };

                    await _assignmentRepo.AddAsync(assignment);

                    var exam = await _examRepo.GetByIdAsync(examId);

                    if (!candidateAssignmentMap.ContainsKey(candidateId))
                        candidateAssignmentMap[candidateId] = new List<(CandidateExamAssignment, Exam)>();

                    candidateAssignmentMap[candidateId].Add((assignment, exam));

                    response.Assignments.Add(new AssignmentItemDto
                    {
                        AssignmentId = assignment.Id,
                        CandidateId = candidateId,
                        ExamId = examId,
                        Token = token,
                        ExamUrl = $"https://cvnokta.com/exam/take/{token}",
                        ExpiresAt = expiresAt,
                        NotificationSent = request.SendNotification
                    });
                }
            }

            response.TotalAssignmentsCreated = response.Assignments.Count;

            // Send consolidated email per candidate (one email listing all assigned exams)
            if (request.SendNotification && request.NotificationChannel == "email")
            {
                foreach (var kvp in candidateAssignmentMap)
                {
                    var candidateId = kvp.Key;
                    var examPairs = kvp.Value;
                    var candidate = await _candidateRepo.GetByIdAsync(candidateId);

                    if (candidate == null) continue;

                    var examLinks = string.Join("\n", examPairs.Select((pair, i) =>
                        $"Sınav {i + 1} — {pair.exam?.Title ?? "Sınav"} ({pair.exam?.TimeLimitMinutes?.ToString() ?? "süresiz"} dk)\nhttps://cvnokta.com/exam/take/{pair.assignment.Token}"));

                    await _emailService.SendAsync(new EmailRequest
                    {
                        To = candidate.Email,
                        Subject = $"CVNokta — {examPairs.Count} Sınav Atandı",
                        Body = $@"Merhaba {candidate.FullName},

Başvurunuz değerlendirme sürecine girmiştir. Aşağıdaki sınavları tamamlamanızı bekliyoruz:

{examLinks}

Son Tarih: {expiresAt:dd MMMM yyyy}

Her sınav için ayrı link kullanmanız gerekmektedir.

Başarılar,
CVNokta İK Ekibi"
                    });
                }
            }

            return response;
        }
    }
}
