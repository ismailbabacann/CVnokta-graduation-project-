using System;

namespace CleanArchitecture.Core.Interfaces
{
    /// <summary>
    /// Generates and validates cryptographic tokens for exam access.
    /// Each (candidateId × examId) pair gets a unique, tamper-proof token.
    /// </summary>
    public interface IExamTokenService
    {
        /// <summary>
        /// Generates a unique HMAC-signed token for a candidate-exam pair.
        /// </summary>
        string GenerateToken(Guid candidateId, Guid examId);

        /// <summary>
        /// Validates that a token has the expected HMAC signature.
        /// NOTE: token existence and expiry are checked separately via DB.
        /// </summary>
        bool ValidateToken(string token);
    }
}
