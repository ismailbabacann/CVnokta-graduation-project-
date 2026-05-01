using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Core.Settings;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Interviews.Commands.SaveRealtimeInterviewSummary
{
    public class SaveRealtimeInterviewSummaryCommand : IRequest<Guid>
    {
        public Guid ApplicationId { get; set; }
        public Guid JobPostingId { get; set; }
        public string ExternalSessionId { get; set; }
        public decimal? OverallInterviewScore { get; set; }
        public decimal? CommunicationScore { get; set; }
        public decimal? TechnicalKnowledgeScore { get; set; }
        public decimal? JobMatchScore { get; set; }
        public decimal? ExperienceAlignmentScore { get; set; }
        public int? TotalQuestionsAsked { get; set; }
        public int? TotalQuestionsAnswered { get; set; }
        public string SummaryText { get; set; }
        public string Strengths { get; set; }
        public string Weaknesses { get; set; }
        public string Recommendations { get; set; }
        public bool? IsPassed { get; set; }
    }

    public class SaveRealtimeInterviewSummaryCommandHandler : IRequestHandler<SaveRealtimeInterviewSummaryCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<AiInterviewSummary> _summaryRepository;
        private readonly IGenericRepositoryAsync<AiInterviewSession> _sessionRepository;
        private readonly IGenericRepositoryAsync<JobApplication> _applicationRepository;
        private readonly IGenericRepositoryAsync<ApplicationStage> _stageRepository;
        private readonly IGenericRepositoryAsync<CvUpload> _cvUploadRepository;
        private readonly IGenericRepositoryAsync<CvAnalysisResult> _cvRepository;
        private readonly IGenericRepositoryAsync<CandidateExamAssignment> _assignmentRepository;
        private readonly IGenericRepositoryAsync<Exam> _examRepository;
        private readonly IGenericRepositoryAsync<Question> _questionRepository;
        private readonly IGenericRepositoryAsync<FinalEvaluationScore> _finalScoreRepository;
        private readonly IPipelineService _pipelineService;

        public SaveRealtimeInterviewSummaryCommandHandler(
            IGenericRepositoryAsync<AiInterviewSummary> summaryRepository,
            IGenericRepositoryAsync<AiInterviewSession> sessionRepository,
            IGenericRepositoryAsync<JobApplication> applicationRepository,
            IGenericRepositoryAsync<ApplicationStage> stageRepository,
            IGenericRepositoryAsync<CvUpload> cvUploadRepository,
            IGenericRepositoryAsync<CvAnalysisResult> cvRepository,
            IGenericRepositoryAsync<CandidateExamAssignment> assignmentRepository,
            IGenericRepositoryAsync<Exam> examRepository,
            IGenericRepositoryAsync<Question> questionRepository,
            IGenericRepositoryAsync<FinalEvaluationScore> finalScoreRepository,
            IPipelineService pipelineService)
        {
            _summaryRepository = summaryRepository;
            _sessionRepository = sessionRepository;
            _applicationRepository = applicationRepository;
            _stageRepository = stageRepository;
            _cvUploadRepository = cvUploadRepository;
            _cvRepository = cvRepository;
            _assignmentRepository = assignmentRepository;
            _examRepository = examRepository;
            _questionRepository = questionRepository;
            _finalScoreRepository = finalScoreRepository;
            _pipelineService = pipelineService;
        }

        public async Task<Guid> Handle(SaveRealtimeInterviewSummaryCommand request, CancellationToken cancellationToken)
        {
            // ── 1. Ensure AiInterviewSession exists (FK requirement) ─────
            // The realtime flow (AI-NLP WebSocket) doesn't create an AiInterviewSession
            // record, but the AiInterviewSummary.SessionId FK references AiInterviewSessions.
            // We must create one before inserting the summary.
            var application = await _applicationRepository.GetByIdAsync(request.ApplicationId);
            if (application == null)
                throw new Exception($"Application not found: {request.ApplicationId}");

            // Get or create ApplicationStage for AI_INTERVIEW
            var allStages = (List<ApplicationStage>)await _stageRepository.GetAllAsync();
            var aiStage = allStages.FindLast(s => s.ApplicationId == request.ApplicationId
                && s.StageType != null && s.StageType.Contains("AI_INTERVIEW"));
            if (aiStage == null)
            {
                aiStage = new ApplicationStage
                {
                    ApplicationId = request.ApplicationId,
                    JobPostingId = request.JobPostingId,
                    StageType = "AI_INTERVIEW",
                    StageStatus = "Completed",
                    StartedAt = DateTime.UtcNow,
                    CompletedAt = DateTime.UtcNow,
                    IsPassed = (request.OverallInterviewScore ?? 0) >= 60
                };
                await _stageRepository.AddAsync(aiStage);
            }

            // Get CvId — from application or latest CvUpload for the candidate
            Guid cvId = application.CvId ?? Guid.Empty;
            if (cvId == Guid.Empty)
            {
                var allUploads = (List<CvUpload>)await _cvUploadRepository.GetAllAsync();
                var latestCv = allUploads
                    .Where(u => u.CandidateId == application.CandidateId)
                    .OrderByDescending(u => u.UploadedAt)
                    .FirstOrDefault();
                cvId = latestCv?.Id ?? Guid.Empty;
            }
            if (cvId == Guid.Empty)
                throw new Exception($"No CV found for application {request.ApplicationId}. Cannot create interview session.");

            // Create AiInterviewSession
            var session = new AiInterviewSession
            {
                ApplicationId = request.ApplicationId,
                JobPostingId = request.JobPostingId,
                StageId = aiStage.Id,
                CvId = cvId,
                SessionStatus = "Completed",
                StartedAt = DateTime.UtcNow,
                CompletedAt = DateTime.UtcNow,
                AiAgentVersion = "realtime-v1"
            };
            await _sessionRepository.AddAsync(session);

            // ── 2. Create AiInterviewSummary with valid SessionId FK ─────
            var summary = new AiInterviewSummary
            {
                ApplicationId = request.ApplicationId,
                SessionId = session.Id,
                OverallInterviewScore = request.OverallInterviewScore,
                CommunicationScore = request.CommunicationScore,
                TechnicalKnowledgeScore = request.TechnicalKnowledgeScore,
                JobMatchScore = request.JobMatchScore,
                ExperienceAlignmentScore = request.ExperienceAlignmentScore,
                TotalQuestionsAsked = request.TotalQuestionsAsked,
                TotalQuestionsAnswered = request.TotalQuestionsAnswered,
                SummaryText = request.SummaryText,
                Strengths = request.Strengths,
                Weaknesses = request.Weaknesses,
                Recommendations = request.Recommendations,
                IsPassed = request.IsPassed
            };

            await _summaryRepository.AddAsync(summary);

            // Advance pipeline stage (COMPLETED or REJECTED_AI)
            decimal score = request.OverallInterviewScore ?? 0m;
            string aiFeedback = string.IsNullOrWhiteSpace(request.Weaknesses) ? request.SummaryText : request.Weaknesses;
            await _pipelineService.AdvanceIfEligibleAsync(request.ApplicationId, "AI_INTERVIEW", score, null, aiFeedback);

            // Auto-calculate FinalEvaluationScore (weighted average of all stages)
            try
            {
                var cvResults = await _cvRepository.GetAllAsync();
                var cvScore = cvResults.FirstOrDefault(c => c.ApplicationId == request.ApplicationId)?.AnalysisScore ?? 0;

                // Get exam scores from CandidateExamAssignment + Exam
                var allAssignments = await _assignmentRepository.GetAllAsync();
                var allExams = await _examRepository.GetAllAsync();
                var allQuestions = await _questionRepository.GetAllAsync();
                var examLookup = allExams.ToDictionary(e => e.Id, e => e);

                // Pre-compute auto-gradable total points per exam
                var examAutoTotals = allQuestions
                    .Where(q => q.QuestionType == "multiple_choice" || q.QuestionType == "true_false")
                    .GroupBy(q => q.ExamId)
                    .ToDictionary(g => g.Key, g => g.Sum(q => q.Points));

                decimal skillsScore = 0m;
                decimal englishScore = 0m;
                foreach (var asgn in allAssignments.Where(a => a.CandidateId == application.CandidateId && a.JobId == request.JobPostingId && a.Status == "submitted"))
                {
                    if (!examLookup.TryGetValue(asgn.ExamId, out var exam)) continue;

                    // Use stored percentage if available, otherwise compute from raw score
                    decimal pct = asgn.ScorePercentage ?? 0;
                    if (pct == 0 && asgn.Score != null && asgn.Score > 0)
                    {
                        examAutoTotals.TryGetValue(asgn.ExamId, out int autoTotal);
                        pct = autoTotal > 0 ? Math.Round(asgn.Score.Value / autoTotal * 100, 1) : 0;
                    }

                    bool isEnglish = exam.SequenceOrder == 1 || (exam.ExamType != null && exam.ExamType.Contains("english"));
                    if (isEnglish)
                        englishScore = pct;
                    else
                        skillsScore = pct;
                }

                decimal interviewScore = request.OverallInterviewScore ?? 0m;

                // Weighted: CV 20%, Skills 25%, English 25%, AI Interview 30%
                decimal totalWeight = 0m, totalScore = 0m;
                if (cvScore > 0) { totalScore += cvScore * ScoringWeights.CvAnalysis; totalWeight += ScoringWeights.CvAnalysis; }
                if (skillsScore > 0) { totalScore += skillsScore * ScoringWeights.SkillsTest; totalWeight += ScoringWeights.SkillsTest; }
                if (englishScore > 0) { totalScore += englishScore * ScoringWeights.EnglishTest; totalWeight += ScoringWeights.EnglishTest; }
                if (interviewScore > 0) { totalScore += interviewScore * ScoringWeights.AiInterview; totalWeight += ScoringWeights.AiInterview; }
                decimal finalWeighted = totalWeight > 0 ? Math.Round(totalScore / totalWeight, 1) : 0m;

                var allFinals = await _finalScoreRepository.GetAllAsync();
                var existing = allFinals.FirstOrDefault(f => f.ApplicationId == request.ApplicationId);
                if (existing != null)
                {
                    existing.CvAnalysisScore = cvScore;
                    existing.GeneralTestScore = skillsScore;
                    existing.AiInterviewScore = interviewScore;
                    existing.WeightedFinalScore = finalWeighted;
                    existing.EvaluationStatus = "Completed";
                    existing.EvaluatedAt = DateTime.UtcNow;
                    await _finalScoreRepository.UpdateAsync(existing);
                }
                else
                {
                    var newRec = new FinalEvaluationScore
                    {
                        ApplicationId = request.ApplicationId,
                        JobPostingId = request.JobPostingId,
                        CvAnalysisScore = cvScore,
                        GeneralTestScore = skillsScore,
                        AiInterviewScore = interviewScore,
                        WeightedFinalScore = finalWeighted,
                        EvaluationStatus = "Completed",
                        EvaluatedAt = DateTime.UtcNow
                    };
                    await _finalScoreRepository.AddAsync(newRec);
                }
            }
            catch { /* FinalEvaluationScore calculation is best-effort */ }

            return summary.Id;
        }
    }
}
