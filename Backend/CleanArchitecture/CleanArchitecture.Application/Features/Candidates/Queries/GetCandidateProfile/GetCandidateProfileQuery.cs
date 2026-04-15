using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System.Threading;
using System.Threading.Tasks;
using System;

namespace CleanArchitecture.Core.Features.Candidates.Queries.GetCandidateProfile
{
    // Displays the candidate's own profile information.
    public class GetCandidateProfileQuery : IRequest<CandidateProfile>
    {
        public Guid UserId { get; set; }
    }

    public class GetCandidateProfileQueryHandler : IRequestHandler<GetCandidateProfileQuery, CandidateProfile>
    {
        private readonly IGenericRepositoryAsync<CandidateProfile> _profileRepository;
        private readonly IGenericRepositoryAsync<User> _userRepository;

        public GetCandidateProfileQueryHandler(
            IGenericRepositoryAsync<CandidateProfile> profileRepository,
            IGenericRepositoryAsync<User> userRepository)
        {
            _profileRepository = profileRepository;
            _userRepository = userRepository;
        }

        public async Task<CandidateProfile> Handle(GetCandidateProfileQuery request, CancellationToken cancellationToken)
        {
            var allProfiles = await _profileRepository.GetAllAsync();
            foreach (var p in allProfiles)
            {
                if (p.UserId == request.UserId) 
                    return p;
            }

            // If profile is not found, fetch from Domain User table to prepopulate
            var user = await _userRepository.GetByIdAsync(request.UserId);
            if (user != null)
            {
                return new CandidateProfile
                {
                    UserId = request.UserId,
                    FullName = user.FullName,
                    Email = user.Email,
                    Phone = user.Phone
                };
            }

            return null;
        }
    }
}
