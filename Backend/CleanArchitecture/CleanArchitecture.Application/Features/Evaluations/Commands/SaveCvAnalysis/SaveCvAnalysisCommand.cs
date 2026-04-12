using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Evaluations.Commands.SaveCvAnalysis
{
    public class SaveCvAnalysisCommand : IRequest<bool>
    {
        public Guid ApplicationId { get; set; }
        public decimal AnalysisScore { get; set; }
        public string MatchingSkills { get; set; }
        public string MissingSkills { get; set; }
        public decimal? ExperienceMatchScore { get; set; }
        public decimal? EducationMatchScore { get; set; }
        public string OverallAssessment { get; set; }
    }

    public class SaveCvAnalysisCommandHandler : IRequestHandler<SaveCvAnalysisCommand, bool>
    {
        private readonly IGenericRepositoryAsync<JobApplication> _applicationRepository;
        private readonly IGenericRepositoryAsync<ApplicationStage> _stageRepository;
        private readonly IGenericRepositoryAsync<CvAnalysisResult> _cvAnalysisRepository;
        private readonly IPipelineService _pipelineService;

        public SaveCvAnalysisCommandHandler(
            IGenericRepositoryAsync<JobApplication> applicationRepository,
            IGenericRepositoryAsync<ApplicationStage> stageRepository,
            IGenericRepositoryAsync<CvAnalysisResult> cvAnalysisRepository,
            IPipelineService pipelineService)
        {
            _applicationRepository = applicationRepository;
            _stageRepository = stageRepository;
            _cvAnalysisRepository = cvAnalysisRepository;
            _pipelineService = pipelineService;
        }

        public async Task<bool> Handle(SaveCvAnalysisCommand request, CancellationToken cancellationToken)
        {
            var application = await _applicationRepository.GetByIdAsync(request.ApplicationId);
            if (application == null)
            {
                return false;
            }

            var allAnalyses = await _cvAnalysisRepository.GetAllAsync();
            var existingAnalysis = allAnalyses.FirstOrDefault(x => x.ApplicationId == request.ApplicationId);

            if (existingAnalysis != null)
            {
                existingAnalysis.AnalysisScore = request.AnalysisScore;
                existingAnalysis.MatchingSkills = request.MatchingSkills;
                existingAnalysis.MissingSkills = request.MissingSkills;
                existingAnalysis.ExperienceMatchScore = request.ExperienceMatchScore;
                existingAnalysis.EducationMatchScore = request.EducationMatchScore;
                existingAnalysis.OverallAssessment = request.OverallAssessment;
                existingAnalysis.AnalysisDate = DateTime.UtcNow;
                await _cvAnalysisRepository.UpdateAsync(existingAnalysis);
            }
            else
            {
                var stages = await _stageRepository.GetAllAsync();
                var currentStage = stages.Where(s => s.ApplicationId == request.ApplicationId).OrderByDescending(s => s.Created).FirstOrDefault();
                var stageId = currentStage?.Id ?? Guid.Empty;

                var newAnalysis = new CvAnalysisResult
                {
                    ApplicationId = request.ApplicationId,
                    StageId = stageId,
                    CvId = application.CvId ?? Guid.Empty,
                    AnalysisScore = request.AnalysisScore,
                    MatchingSkills = request.MatchingSkills,
                    MissingSkills = request.MissingSkills,
                    ExperienceMatchScore = request.ExperienceMatchScore,
                    EducationMatchScore = request.EducationMatchScore,
                    OverallAssessment = request.OverallAssessment,
                    AnalysisDate = DateTime.UtcNow
                };
                await _cvAnalysisRepository.AddAsync(newAnalysis);
            }

            // ── Pipeline: automatically advance or reject based on NLP score ──
            try
            {
                await _pipelineService.AdvanceIfEligibleAsync(request.ApplicationId, "NLP_REVIEW", request.AnalysisScore);
            }
            catch { /* pipeline failures must not block the analysis save */ }

            return true;
        }
    }
}
