using System;
using CleanArchitecture.Core.Filters;
using CleanArchitecture.Core.Wrappers;
using MediatR;

namespace CleanArchitecture.Core.Features.Applications.Queries.GetCandidatePool
{
    public class GetCandidatePoolQuery : RequestParameter, IRequest<PagedResponse<CandidatePoolDto>>
    {
        public string SearchTerm { get; set; }
        public string SortBy { get; set; }
        public Guid? JobPostingId { get; set; }
    }
}
