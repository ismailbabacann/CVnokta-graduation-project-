using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Evaluations.Queries.GetCandidateRankings
{
    // Returns the candidate success rankings (via View) for a specific job posting.
    public class GetCandidateRankingsQuery : IRequest<IEnumerable<CandidateRankingView>>
    {
        public Guid JobPostingId { get; set; }
    }

    public class GetCandidateRankingsQueryHandler : IRequestHandler<GetCandidateRankingsQuery, IEnumerable<CandidateRankingView>>
    {
        private readonly IGenericRepositoryAsync<CandidateRankingView> _repository;

        public GetCandidateRankingsQueryHandler(IGenericRepositoryAsync<CandidateRankingView> repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<CandidateRankingView>> Handle(GetCandidateRankingsQuery request, CancellationToken cancellationToken)
        {
            var all = await _repository.GetAllAsync();
            var result = new List<CandidateRankingView>();
            foreach(var r in all)
            {
                if(r.JobPostingId == request.JobPostingId) result.Add(r);
            }
            return result;
        }
    }
}
