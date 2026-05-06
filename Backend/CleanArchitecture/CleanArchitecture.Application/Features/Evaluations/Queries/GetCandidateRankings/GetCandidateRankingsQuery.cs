using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Core.Settings;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Evaluations.Queries.GetCandidateRankings
{
    // Returns the candidate success rankings for a specific job posting.
    // Computed directly from application tables - no SQL View dependency.
    public class GetCandidateRankingsQuery : IRequest<IEnumerable<CandidateRankingView>>
    {
        public Guid JobPostingId { get; set; }
    }

    public class GetCandidateRankingsQueryHandler : IRequestHandler<GetCandidateRankingsQuery, IEnumerable<CandidateRankingView>>
    {
        private readonly IGenericRepositoryAsync<JobApplication> _applicationRepository;
        private readonly IGenericRepositoryAsync<CandidateProfile> _profileRepository;
        private readonly IGenericRepositoryAsync<CvAnalysisResult> _cvAnalysisRepository;
        private readonly IGenericRepositoryAsync<AiInterviewSummary> _interviewRepository;
        private readonly IGenericRepositoryAsync<CandidateExamAssignment> _assignmentRepository;
        private readonly IGenericRepositoryAsync<Exam> _examRepository;
        private readonly IGenericRepositoryAsync<Question> _questionRepository;
        private readonly IGenericRepositoryAsync<FinalEvaluationScore> _finalScoreRepository;

        public GetCandidateRankingsQueryHandler(
            IGenericRepositoryAsync<JobApplication> applicationRepository,
            IGenericRepositoryAsync<CandidateProfile> profileRepository,
            IGenericRepositoryAsync<CvAnalysisResult> cvAnalysisRepository,
            IGenericRepositoryAsync<AiInterviewSummary> interviewRepository,
            IGenericRepositoryAsync<CandidateExamAssignment> assignmentRepository,
            IGenericRepositoryAsync<Exam> examRepository,
            IGenericRepositoryAsync<Question> questionRepository,
            IGenericRepositoryAsync<FinalEvaluationScore> finalScoreRepository)
        {
            _applicationRepository = applicationRepository;
            _profileRepository = profileRepository;
            _cvAnalysisRepository = cvAnalysisRepository;
            _interviewRepository = interviewRepository;
            _assignmentRepository = assignmentRepository;
            _examRepository = examRepository;
            _questionRepository = questionRepository;
            _finalScoreRepository = finalScoreRepository;
        }

        public async Task<IEnumerable<CandidateRankingView>> Handle(GetCandidateRankingsQuery request, CancellationToken cancellationToken)
        {
            var apps = await _applicationRepository.GetAllAsync();
            var profiles = await _profileRepository.GetAllAsync();
            var analyses = await _cvAnalysisRepository.GetAllAsync();
            var interviews = await _interviewRepository.GetAllAsync();
            var assignments = await _assignmentRepository.GetAllAsync();
            var exams = await _examRepository.GetAllAsync();
            var questions = await _questionRepository.GetAllAsync();
            var finalScores = await _finalScoreRepository.GetAllAsync();

            // Pre-build exam type lookup: ExamId → ExamType/SequenceOrder
            var examLookup = exams.ToDictionary(e => e.Id, e => e);

            // Pre-compute auto-gradable total points per exam for percentage calculation
            var examAutoTotals = questions
                .Where(q => q.QuestionType == "multiple_choice" || q.QuestionType == "true_false")
                .GroupBy(q => q.ExamId)
                .ToDictionary(g => g.Key, g => g.Sum(q => q.Points));

            // Filter only applications for this job
            var jobApps = apps.Where(a => a.JobPostingId == request.JobPostingId).ToList();

            // Build ranking from applications + all score tables (LEFT JOIN style)
            var ranked = jobApps
                .Select(a =>
                {
                    var profile = profiles.FirstOrDefault(p => p.Id == a.CandidateId);
                    var analysis = analyses.FirstOrDefault(c => c.ApplicationId == a.Id);
                    var interview = interviews
                        .Where(i => i.ApplicationId == a.Id)
                        .OrderByDescending(i => i.Created)
                        .FirstOrDefault();

                    // Get exam scores from CandidateExamAssignment + Exam
                    var candidateAssignments = assignments
                        .Where(asgn => asgn.CandidateId == a.CandidateId && asgn.JobId == a.JobPostingId && asgn.Status == "submitted")
                        .ToList();

                    decimal? skillsScore = null;
                    decimal? engScore = null;
                    foreach (var asgn in candidateAssignments)
                    {
                        if (!examLookup.TryGetValue(asgn.ExamId, out var exam)) continue;

                        // Use stored percentage if available, otherwise compute from raw score
                        decimal? pct = asgn.ScorePercentage;
                        if (pct == null && asgn.Score != null)
                        {
                            examAutoTotals.TryGetValue(asgn.ExamId, out int autoTotal);
                            pct = autoTotal > 0 ? Math.Round(asgn.Score.Value / autoTotal * 100, 1) : 0;
                        }

                        bool isEnglish = exam.SequenceOrder == 1 || (exam.ExamType != null && exam.ExamType.Contains("english"));
                        if (isEnglish)
                            engScore = pct;
                        else
                            skillsScore = pct;
                    }

                    decimal? cvScore = analysis?.AnalysisScore;
                    decimal? aiScore = interview?.OverallInterviewScore;

                    // Always compute weighted score on the fly from actual sources
                    decimal totalWeight = 0m;
                    decimal totalScore = 0m;
                    if (cvScore.HasValue) { totalScore += cvScore.Value * ScoringWeights.CvAnalysis; totalWeight += ScoringWeights.CvAnalysis; }
                    if (skillsScore.HasValue) { totalScore += skillsScore.Value * ScoringWeights.SkillsTest; totalWeight += ScoringWeights.SkillsTest; }
                    if (engScore.HasValue) { totalScore += engScore.Value * ScoringWeights.EnglishTest; totalWeight += ScoringWeights.EnglishTest; }
                    if (aiScore.HasValue) { totalScore += aiScore.Value * ScoringWeights.AiInterview; totalWeight += ScoringWeights.AiInterview; }
                    decimal? weighted = totalWeight > 0 ? Math.Round(totalScore / totalWeight, 1) : cvScore;

                    return new CandidateRankingView
                    {
                        ApplicationId = a.Id,
                        JobPostingId = a.JobPostingId,
                        CandidateId = a.CandidateId,
                        CandidateFullName = profile?.FullName ?? "Bilinmeyen Aday",
                        Email = profile?.Email ?? "",
                        CvUrl = a.CvUrl,
                        CvAnalysisScore = cvScore,
                        GeneralTestScore = skillsScore ?? engScore,
                        SkillsTestScore = skillsScore,
                        EnglishTestScore = engScore,
                        AiInterviewScore = aiScore,
                        FinalWeightedScore = weighted,
                        ApplicationStatus = a.ApplicationStatus,
                        CurrentPipelineStage = a.CurrentPipelineStage,
                        LastUpdated = a.LastModified,
                        ApplicationDate = a.Created,
                        Location = profile?.Location,
                        LinkedInProfile = profile?.LinkedInProfile,
                        CoverLetter = a.CoverLetter,
                    };
                })
                .OrderByDescending(r => r.FinalWeightedScore ?? 0)
                .Select((r, i) => { r.RankPosition = i + 1; return r; })
                .ToList();

            return ranked;
        }
    }
}
