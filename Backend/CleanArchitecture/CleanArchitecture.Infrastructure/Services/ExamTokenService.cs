using System;
using System.Security.Cryptography;
using System.Text;
using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Core.Settings;
using Microsoft.Extensions.Options;

namespace CleanArchitecture.Infrastructure.Services
{
    /// <summary>
    /// Generates HMAC-SHA256 signed tokens for exam access.
    /// Token format: {base64url(uuid)}.{base64url(hmac_signature)}
    /// Each (candidateId × examId) pair gets a unique, tamper-proof token.
    /// </summary>
    public class ExamTokenService : IExamTokenService
    {
        private readonly ExamSettings _settings;

        public ExamTokenService(IOptions<ExamSettings> settings)
        {
            _settings = settings.Value;
        }

        public string GenerateToken(Guid candidateId, Guid examId)
        {
            // Unique payload: uuid + candidate + exam + timestamp
            var uniqueId = Guid.NewGuid().ToString("N");
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();
            var payload = $"{uniqueId}:{candidateId:N}:{examId:N}:{timestamp}";

            var payloadBase64 = Base64UrlEncode(Encoding.UTF8.GetBytes(payload));
            var signature = ComputeHmac(payload);

            return $"{payloadBase64}.{signature}";
        }

        public bool ValidateToken(string token)
        {
            if (string.IsNullOrWhiteSpace(token)) return false;

            var parts = token.Split('.');
            if (parts.Length != 2) return false;

            try
            {
                var payloadBytes = Base64UrlDecode(parts[0]);
                var payload = Encoding.UTF8.GetString(payloadBytes);
                var expectedSignature = ComputeHmac(payload);
                return string.Equals(expectedSignature, parts[1], StringComparison.Ordinal);
            }
            catch
            {
                return false;
            }
        }

        private string ComputeHmac(string payload)
        {
            var keyBytes = Encoding.UTF8.GetBytes(_settings.TokenSecretKey ?? "default-exam-key-change-in-production");
            using var hmac = new HMACSHA256(keyBytes);
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            return Base64UrlEncode(hash);
        }

        private static string Base64UrlEncode(byte[] bytes)
            => Convert.ToBase64String(bytes)
                .TrimEnd('=')
                .Replace('+', '-')
                .Replace('/', '_');

        private static byte[] Base64UrlDecode(string input)
        {
            var padded = input
                .Replace('-', '+')
                .Replace('_', '/');
            padded += (padded.Length % 4) switch
            {
                2 => "==",
                3 => "=",
                _ => ""
            };
            return Convert.FromBase64String(padded);
        }
    }
}
