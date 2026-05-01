using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
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
        private readonly IGenericRepositoryAsync<GeneralTestResult> _testRepository;
        private readonly IGenericRepositoryAsync<FinalEvaluationScore> _finalScoreRepository;

        public GetCandidateRankingsQueryHandler(
            IGenericRepositoryAsync<JobApplication> applicationRepository,
            IGenericRepositoryAsync<CandidateProfile> profileRepository,
            IGenericRepositoryAsync<CvAnalysisResult> cvAnalysisRepository,
            IGenericRepositoryAsync<AiInterviewSummary> interviewRepository,
            IGenericRepositoryAsync<GeneralTestResult> testRepository,
            IGenericRepositoryAsync<FinalEvaluationScore> finalScoreRepository)
        {
            _applicationRepository = applicationRepository;
            _profileRepository = profileRepository;
            _cvAnalysisRepository = cvAnalysisRepository;
            _interviewRepository = interviewRepository;
            _testRepository = testRepository;
            _finalScoreRepository = finalScoreRepository;
        }

        public async Task<IEnumerable<CandidateRankingView>> Handle(GetCandidateRankingsQuery request, CancellationToken cancellationToken)
        {
            var apps = await _applicationRepository.GetAllAsync();
            var profiles = await _profileRepository.GetAllAsync();
            var analyses = await _cvAnalysisRepository.GetAllAsync();
            var interviews = await _interviewRepository.GetAllAsync();
            var tests = await _testRepository.GetAllAsync();
            var finalScores = await _finalScoreRepository.GetAllAsync();

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
                    var skillTest = tests.FirstOrDefault(t => t.ApplicationId == a.Id && t.TestName != null && t.TestName.Contains("Skill"));
                    var englishTest = tests.FirstOrDefault(t => t.ApplicationId == a.Id && t.TestName != null && t.TestName.Contains("English"));
                    var finalScore = finalScores.FirstOrDefault(f => f.ApplicationId == a.Id);

                    decimal? cvScore = analysis?.AnalysisScore;
                    decimal? skillsScore = skillTest?.Score;
                    decimal? engScore = englishTest?.Score;
                    decimal? aiScore = interview?.OverallInterviewScore;

                    // Use pre-calculated final score if available, otherwise compute weighted average
                    decimal? weighted = finalScore?.WeightedFinalScore;
                    if (weighted == null || weighted == 0)
                    {
                        // Weighted: CV 20%, Skills 25%, English 25%, AI Interview 30%
                        decimal totalWeight = 0m;
                        decimal totalScore = 0m;
                        if (cvScore.HasValue && cvScore > 0) { totalScore += cvScore.Value * 0.20m; totalWeight += 0.20m; }
                        if (skillsScore.HasValue && skillsScore > 0) { totalScore += skillsScore.Value * 0.25m; totalWeight += 0.25m; }
                        if (engScore.HasValue && engScore > 0) { totalScore += engScore.Value * 0.25m; totalWeight += 0.25m; }
                        if (aiScore.HasValue && aiScore > 0) { totalScore += aiScore.Value * 0.30m; totalWeight += 0.30m; }
                        weighted = totalWeight > 0 ? Math.Round(totalScore / totalWeight, 1) : cvScore;
                    }

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
                        LastUpdated = a.LastModified
                    };
                })
                .OrderByDescending(r => r.FinalWeightedScore ?? 0)
                .Select((r, i) => { r.RankPosition = i + 1; return r; })
                .ToList();

            return ranked;
        }
    }
}
