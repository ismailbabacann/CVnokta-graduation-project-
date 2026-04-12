using CleanArchitecture.Core.Interfaces;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;

namespace CleanArchitecture.WebApi.Services
{
    public class AuthenticatedUserService : IAuthenticatedUserService
    {
        public AuthenticatedUserService(IHttpContextAccessor httpContextAccessor)
        {
            var user = httpContextAccessor.HttpContext?.User;
            UserId = user?.FindFirstValue("uid");
            Roles = user?.FindAll("role").Select(c => c.Value).ToList() ?? new List<string>();
        }

        public string UserId { get; }
        public List<string> Roles { get; }
    }
}
