using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System.Threading;
using System.Threading.Tasks;
using System;

namespace CleanArchitecture.Core.Features.Candidates.Queries.GetCandidateProfile
{
    // Adayın kendi profil bilgilerini görmesini sağlar.
    public class GetCandidateProfileQuery : IRequest<CandidateProfile>
    {
        public Guid UserId { get; set; }
    }

    public class GetCandidateProfileQueryHandler : IRequestHandler<GetCandidateProfileQuery, CandidateProfile>
    {
        private readonly IGenericRepositoryAsync<CandidateProfile> _repository;

        public GetCandidateProfileQueryHandler(IGenericRepositoryAsync<CandidateProfile> repository)
        {
            _repository = repository;
        }

        public async Task<CandidateProfile> Handle(GetCandidateProfileQuery request, CancellationToken cancellationToken)
        {
            // Ideally use GetAsync with expression filter.
            // Assuming GetAllAsync and LINQ for now if GenericRepo doesn't expose expression based queries.
            var allProfiles = await _repository.GetAllAsync();
            foreach (var p in allProfiles)
            {
                if (p.UserId == request.UserId) return p;
            }
            return null;
        }
    }
}
