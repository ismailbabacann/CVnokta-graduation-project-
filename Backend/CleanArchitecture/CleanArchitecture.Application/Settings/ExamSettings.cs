namespace CleanArchitecture.Core.Settings
{
    public class ExamSettings
    {
        /// <summary>
        /// Secret key used for HMAC-SHA256 signing of exam access tokens.
        /// Must be at least 32 characters. Store securely in environment variables or Azure Key Vault.
        /// </summary>
        public string TokenSecretKey { get; set; }

        /// <summary>Base URL used when generating exam links in emails.</summary>
        public string ExamBaseUrl { get; set; } = "https://cvnokta.com/exam/take";
    }
}
