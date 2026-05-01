using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Evaluations.Queries.GetFinalScorecard
{
    /// <summary>
    /// Rich scorecard response matching Frontend BestCandidates modal expectations.
    /// </summary>
    public class ScorecardResponse
    {
        public CvAnalysisDto CvAnalysisResult { get; set; }
        public GeneralTestDto GeneralTestResult { get; set; }
        public decimal? EnglishTestScore { get; set; }
        public AiInterviewSummaryDto AiInterviewSummary { get; set; }
        public FinalScoreDto FinalEvaluationScore { get; set; }
    }

    public class CvAnalysisDto
    {
        public decimal? AnalysisScore { get; set; }
        public List<string> MatchedSkills { get; set; }
        public List<string> MissingSkills { get; set; }
        public string Summary { get; set; }
    }

    public class GeneralTestDto
    {
        public decimal? Score { get; set; }
        public int? TotalQuestions { get; set; }
        public int? CorrectAnswers { get; set; }
        public int? WrongAnswers { get; set; }
    }

    public class AiInterviewSummaryDto
    {
        public decimal? OverallInterviewScore { get; set; }
        public decimal? CommunicationScore { get; set; }
        public decimal? TechnicalKnowledgeScore { get; set; }
        public decimal? JobMatchScore { get; set; }
        public decimal? ExperienceAlignmentScore { get; set; }
        public string Strengths { get; set; }
        public string Weaknesses { get; set; }
        public string OverallFeedback { get; set; }
        public string Recommendation { get; set; }
        public int? TotalQuestionsAsked { get; set; }
        public int? TotalQuestionsAnswered { get; set; }
        public bool? IsPassed { get; set; }
    }

    public class FinalScoreDto
    {
        public decimal? WeightedFinalScore { get; set; }
        public string EvaluationStatus { get; set; }
    }

    public class GetFinalScorecardQuery : IRequest<ScorecardResponse>
    {
        public Guid ApplicationId { get; set; }
    }

    public class GetFinalScorecardQueryHandler : IRequestHandler<GetFinalScorecardQuery, ScorecardResponse>
    {
        private readonly IGenericRepositoryAsync<CvAnalysisResult> _cvRepository;
        private readonly IGenericRepositoryAsync<GeneralTestResult> _testRepository;
        private readonly IGenericRepositoryAsync<AiInterviewSummary> _interviewRepository;
        private readonly IGenericRepositoryAsync<FinalEvaluationScore> _finalRepository;

        public GetFinalScorecardQueryHandler(
            IGenericRepositoryAsync<CvAnalysisResult> cvRepository,
            IGenericRepositoryAsync<GeneralTestResult> testRepository,
            IGenericRepositoryAsync<AiInterviewSummary> interviewRepository,
            IGenericRepositoryAsync<FinalEvaluationScore> finalRepository)
        {
            _cvRepository = cvRepository;
            _testRepository = testRepository;
            _interviewRepository = interviewRepository;
            _finalRepository = finalRepository;
        }

        public async Task<ScorecardResponse> Handle(GetFinalScorecardQuery request, CancellationToken cancellationToken)
        {
            var response = new ScorecardResponse();

            // CV Analysis
            var cvAll = await _cvRepository.GetAllAsync();
            var cv = cvAll.FirstOrDefault(c => c.ApplicationId == request.ApplicationId);
            if (cv != null)
            {
                response.CvAnalysisResult = new CvAnalysisDto
                {
                    AnalysisScore = cv.AnalysisScore,
                    MatchedSkills = ParseSkillList(cv.MatchingSkills),
                    MissingSkills = ParseSkillList(cv.MissingSkills),
                    Summary = cv.OverallAssessment
                };
            }

            // Test Results
            var testAll = await _testRepository.GetAllAsync();
            var skillTest = testAll.FirstOrDefault(t => t.ApplicationId == request.ApplicationId && t.TestName != null && t.TestName.Contains("Skill"));
            if (skillTest != null)
            {
                response.GeneralTestResult = new GeneralTestDto
                {
                    Score = skillTest.Score,
                    TotalQuestions = skillTest.TotalQuestions,
                    CorrectAnswers = skillTest.CorrectAnswers,
                    WrongAnswers = skillTest.WrongAnswers
                };
            }

            var englishTest = testAll.FirstOrDefault(t => t.ApplicationId == request.ApplicationId && t.TestName != null && t.TestName.Contains("English"));
            response.EnglishTestScore = englishTest?.Score;

            // AI Interview Summary
            var interviewAll = await _interviewRepository.GetAllAsync();
            var interview = interviewAll
                .Where(i => i.ApplicationId == request.ApplicationId)
                .OrderByDescending(i => i.Created)
                .FirstOrDefault();
            if (interview != null)
            {
                response.AiInterviewSummary = new AiInterviewSummaryDto
                {
                    OverallInterviewScore = interview.OverallInterviewScore,
                    CommunicationScore = interview.CommunicationScore,
                    TechnicalKnowledgeScore = interview.TechnicalKnowledgeScore,
                    JobMatchScore = interview.JobMatchScore,
                    ExperienceAlignmentScore = interview.ExperienceAlignmentScore,
                    Strengths = interview.Strengths,
                    Weaknesses = interview.Weaknesses,
                    OverallFeedback = interview.SummaryText,
                    Recommendation = interview.Recommendations,
                    TotalQuestionsAsked = interview.TotalQuestionsAsked,
                    TotalQuestionsAnswered = interview.TotalQuestionsAnswered,
                    IsPassed = interview.IsPassed
                };
            }

            // Final Evaluation Score
            var finalAll = await _finalRepository.GetAllAsync();
            var final_ = finalAll.FirstOrDefault(f => f.ApplicationId == request.ApplicationId);
            if (final_ != null)
            {
                response.FinalEvaluationScore = new FinalScoreDto
                {
                    WeightedFinalScore = final_.WeightedFinalScore,
                    EvaluationStatus = final_.EvaluationStatus
                };
            }

            return response;
        }

        private static List<string> ParseSkillList(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return new List<string>();
            return raw.Split(new[] { ',', ';', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                      .Select(s => s.Trim())
                      .Where(s => s.Length > 0)
                      .ToList();
        }
    }
}
