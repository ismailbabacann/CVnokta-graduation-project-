using CleanArchitecture.Core.Wrappers;
using MediatR;

namespace CleanArchitecture.Core.Features.Applications.Queries.GetCandidatePoolStats
{
    public class GetCandidatePoolStatsQuery : IRequest<CandidatePoolStatsDto>
    {
    }
}
