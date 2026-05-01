using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Core.Settings;
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
        private readonly IGenericRepositoryAsync<CandidateExamAssignment> _assignmentRepository;
        private readonly IGenericRepositoryAsync<Exam> _examRepository;
        private readonly IGenericRepositoryAsync<Question> _questionRepository;
        private readonly IGenericRepositoryAsync<JobApplication> _applicationRepository;
        private readonly IGenericRepositoryAsync<AiInterviewSummary> _interviewRepository;
        private readonly IGenericRepositoryAsync<FinalEvaluationScore> _finalRepository;

        public GetFinalScorecardQueryHandler(
            IGenericRepositoryAsync<CvAnalysisResult> cvRepository,
            IGenericRepositoryAsync<CandidateExamAssignment> assignmentRepository,
            IGenericRepositoryAsync<Exam> examRepository,
            IGenericRepositoryAsync<Question> questionRepository,
            IGenericRepositoryAsync<JobApplication> applicationRepository,
            IGenericRepositoryAsync<AiInterviewSummary> interviewRepository,
            IGenericRepositoryAsync<FinalEvaluationScore> finalRepository)
        {
            _cvRepository = cvRepository;
            _assignmentRepository = assignmentRepository;
            _examRepository = examRepository;
            _questionRepository = questionRepository;
            _applicationRepository = applicationRepository;
            _interviewRepository = interviewRepository;
            _finalRepository = finalRepository;
        }

        public async Task<ScorecardResponse> Handle(GetFinalScorecardQuery request, CancellationToken cancellationToken)
        {
            var response = new ScorecardResponse();

            // Get the application to find candidateId and jobId
            var allApps = await _applicationRepository.GetAllAsync();
            var app = allApps.FirstOrDefault(a => a.Id == request.ApplicationId);

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

            // Test Results from CandidateExamAssignment + Exam
            if (app != null)
            {
                var allAssignments = await _assignmentRepository.GetAllAsync();
                var allExams = await _examRepository.GetAllAsync();
                var allQuestions = await _questionRepository.GetAllAsync();
                var examLookup = allExams.ToDictionary(e => e.Id, e => e);

                // Pre-compute auto-gradable total points per exam
                var examAutoTotals = allQuestions
                    .Where(q => q.QuestionType == "multiple_choice" || q.QuestionType == "true_false")
                    .GroupBy(q => q.ExamId)
                    .ToDictionary(g => g.Key, g => g.Sum(q => q.Points));

                var candidateAssignments = allAssignments
                    .Where(a => a.CandidateId == app.CandidateId && a.JobId == app.JobPostingId && a.Status == "submitted")
                    .ToList();

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
                    {
                        response.EnglishTestScore = pct;
                    }
                    else
                    {
                        response.GeneralTestResult = new GeneralTestDto
                        {
                            Score = pct
                        };
                    }
                }
            }

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

            // Final Evaluation Score — always compute on the fly from actual sources
            {
                decimal? cvVal = response.CvAnalysisResult?.AnalysisScore;
                decimal? skillVal = response.GeneralTestResult?.Score;
                decimal? engVal = response.EnglishTestScore;
                decimal? aiVal = response.AiInterviewSummary?.OverallInterviewScore;

                decimal totalWeight = 0m, totalScore = 0m;
                if (cvVal.HasValue) { totalScore += cvVal.Value * ScoringWeights.CvAnalysis; totalWeight += ScoringWeights.CvAnalysis; }
                if (skillVal.HasValue) { totalScore += skillVal.Value * ScoringWeights.SkillsTest; totalWeight += ScoringWeights.SkillsTest; }
                if (engVal.HasValue) { totalScore += engVal.Value * ScoringWeights.EnglishTest; totalWeight += ScoringWeights.EnglishTest; }
                if (aiVal.HasValue) { totalScore += aiVal.Value * ScoringWeights.AiInterview; totalWeight += ScoringWeights.AiInterview; }

                decimal? weighted = totalWeight > 0 ? Math.Round(totalScore / totalWeight, 1) : cvVal;

                // Use DB status but compute score on the fly
                var finalAll = await _finalRepository.GetAllAsync();
                var final_ = finalAll.FirstOrDefault(f => f.ApplicationId == request.ApplicationId);

                response.FinalEvaluationScore = new FinalScoreDto
                {
                    WeightedFinalScore = weighted,
                    EvaluationStatus = final_?.EvaluationStatus ?? (weighted.HasValue ? "Completed" : "Pending")
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
