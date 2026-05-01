namespace CleanArchitecture.Core.Settings
{
    /// <summary>
    /// Central definition of pipeline stage weights used for final score calculation.
    /// Single source of truth — do NOT hardcode these values elsewhere.
    /// </summary>
    public static class ScoringWeights
    {
        public const decimal CvAnalysis = 0.20m;
        public const decimal SkillsTest = 0.25m;
        public const decimal EnglishTest = 0.25m;
        public const decimal AiInterview = 0.30m;
    }
}
