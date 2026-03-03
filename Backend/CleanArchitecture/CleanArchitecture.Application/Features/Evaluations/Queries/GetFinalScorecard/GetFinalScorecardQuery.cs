using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Evaluations.Queries.GetFinalScorecard
{
    // Returns the final evaluation scorecard summarizing a candidate's CV, Test, and Interview scores.
    public class GetFinalScorecardQuery : IRequest<FinalEvaluationScore>
    {
        public Guid ApplicationId { get; set; }
    }

    public class GetFinalScorecardQueryHandler : IRequestHandler<GetFinalScorecardQuery, FinalEvaluationScore>
    {
        private readonly IGenericRepositoryAsync<FinalEvaluationScore> _repository;

        public GetFinalScorecardQueryHandler(IGenericRepositoryAsync<FinalEvaluationScore> repository)
        {
            _repository = repository;
        }

        public async Task<FinalEvaluationScore> Handle(GetFinalScorecardQuery request, CancellationToken cancellationToken)
        {
            var all = await _repository.GetAllAsync();
            foreach(var s in all)
            {
                if(s.ApplicationId == request.ApplicationId) return s;
            }
            return null;
        }
    }
}
