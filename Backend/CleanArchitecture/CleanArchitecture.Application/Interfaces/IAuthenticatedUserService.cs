using System.Collections.Generic;

namespace CleanArchitecture.Core.Interfaces
{
    public interface IAuthenticatedUserService
    {
        string UserId { get; }
        List<string> Roles { get; }
    }
}
