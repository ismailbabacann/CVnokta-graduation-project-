using AutoMapper;
using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Candidates.Commands.CreateCandidateProfile
{
    // Adayın yeni bir profil oluşturmasını sağlar.
    public class CreateCandidateProfileCommand : IRequest<Guid>
    {
        public string FullName { get; set; }
        public string Summary { get; set; }
        public int? ExperienceYears { get; set; }
        public string EducationLevel { get; set; }
        public string Location { get; set; }
    }

    public class CreateCandidateProfileCommandHandler : IRequestHandler<CreateCandidateProfileCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<CandidateProfile> _repository;
        private readonly IMapper _mapper;
        private readonly IAuthenticatedUserService _authenticatedUserService;

        public CreateCandidateProfileCommandHandler(IGenericRepositoryAsync<CandidateProfile> repository, IMapper mapper, IAuthenticatedUserService authenticatedUserService)
        {
            _repository = repository;
            _mapper = mapper;
            _authenticatedUserService = authenticatedUserService;
        }

        public async Task<Guid> Handle(CreateCandidateProfileCommand request, CancellationToken cancellationToken)
        {
            var profile = _mapper.Map<CandidateProfile>(request);
            
            // UserId is now Guid in Entity
            profile.UserId = Guid.Parse(_authenticatedUserService.UserId);

            await _repository.AddAsync(profile);
            return profile.Id;
        }
    }
}
