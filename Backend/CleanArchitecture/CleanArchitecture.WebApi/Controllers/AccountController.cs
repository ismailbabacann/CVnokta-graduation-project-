using CleanArchitecture.Core.DTOs.Account;
using CleanArchitecture.Core.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Threading.Tasks;

namespace CleanArchitecture.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AccountController : ControllerBase
    {
        private readonly IAccountService _accountService;
        public AccountController(IAccountService accountService)
        {
            _accountService = accountService;
        }
        [HttpPost("authenticate")]
        public async Task<IActionResult> AuthenticateAsync(AuthenticationRequest request)
        {
            return Ok(await _accountService.AuthenticateAsync(request, GenerateIPAddress()));
        }
        [HttpPost("register")]
        public async Task<IActionResult> RegisterAsync(RegisterRequest request)
        {
            // Use the backend server's URL instead of the frontend origin for the confirmation link
            var origin = $"{Request.Scheme}://{Request.Host.Value}";
            return Ok(await _accountService.RegisterAsync(request, origin));
        }
        [HttpGet("confirm-email")]
        public async Task<IActionResult> ConfirmEmailAsync([FromQuery] string userId, [FromQuery] string code)
        {
            var origin = Request.Headers["origin"].FirstOrDefault() ?? "http://localhost:3000";
            await _accountService.ConfirmEmailAsync(userId, code);
            return Redirect(origin);
        }
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest model)
        {
            var origin = Request.Headers["origin"].FirstOrDefault() ?? "https://localhost:9001";
            var result = await _accountService.ForgotPassword(model,origin);
            return Ok(result);
        }
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword(ResetPasswordRequest model)
        {

            return Ok(await _accountService.ResetPassword(model));
        }

        /// <summary>
        /// Oturum açmış kullanıcının şifresini değiştirir.
        /// </summary>
        /// <remarks>
        /// Örnek istek:
        ///
        ///     POST /api/Account/change-password
        ///     {
        ///         "currentPassword": "EskiSifre123!",
        ///         "newPassword": "YeniSifre456!",
        ///         "confirmNewPassword": "YeniSifre456!"
        ///     }
        /// </remarks>
        /// <returns>Başarı mesajı</returns>
        [HttpPost("change-password")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        [ProducesResponseType(typeof(object), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest model)
        {
            // JWT'den kullanıcı Id'sini al
            var userId = User.FindFirst("uid")?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { Message = "Kullanıcı kimliği doğrulanamadı." });

            var result = await _accountService.ChangePasswordAsync(userId, model);
            return Ok(new { Succeeded = true, Message = result });
        }

        private string GenerateIPAddress()
        {
            if (Request.Headers.ContainsKey("X-Forwarded-For"))
                return Request.Headers["X-Forwarded-For"];
            else
                return HttpContext.Connection.RemoteIpAddress.MapToIPv4().ToString();
        }
    }
}