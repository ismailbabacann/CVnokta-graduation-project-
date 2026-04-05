using CleanArchitecture.Core.DTOs.Email;
using CleanArchitecture.Core.Exceptions;
using CleanArchitecture.Core.Interfaces;
using CleanArchitecture.Core.Settings;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Resend;
using System.Threading.Tasks;

namespace CleanArchitecture.Infrastructure.Services
{
    public class ResendEmailService : IEmailService
    {
        public ResendSettings _resendSettings { get; }
        public ILogger<ResendEmailService> _logger { get; }

        public ResendEmailService(IOptions<ResendSettings> resendSettings, ILogger<ResendEmailService> logger)
        {
            _resendSettings = resendSettings.Value;
            _logger = logger;
        }

        public async Task SendAsync(EmailRequest request)
        {
            try
            {
                IResend resend = ResendClient.Create(_resendSettings.ApiKey);

                var message = new EmailMessage()
                {
                    From = $"{_resendSettings.FromName} <{request.From ?? _resendSettings.FromEmail}>",
                    To = request.To,
                    Subject = request.Subject,
                    HtmlBody = request.Body,
                };

                var resp = await resend.EmailSendAsync(message);
                
                // You can log the response if needed
                _logger.LogInformation("Resend Email sent successfully.");
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex.Message, ex);
                throw new ApiException($"Failed to send email via Resend: {ex.Message}");
            }
        }
    }
}
