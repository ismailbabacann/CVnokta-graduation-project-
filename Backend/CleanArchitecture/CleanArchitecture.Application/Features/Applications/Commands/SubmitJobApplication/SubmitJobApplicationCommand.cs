using AutoMapper;
using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Applications.Commands.SubmitJobApplication
{
    // Adayın bir iş ilanına başvurmasını sağlar.
    public class SubmitJobApplicationCommand : IRequest<Guid>
    {
        public Guid JobPostingId { get; set; }
        public Guid CandidateId { get; set; }
        public Guid CvId { get; set; }
        public string CoverLetter { get; set; }
    }

    public class SubmitJobApplicationCommandHandler : IRequestHandler<SubmitJobApplicationCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<JobApplication> _repository;
        private readonly IMapper _mapper;

        public SubmitJobApplicationCommandHandler(IGenericRepositoryAsync<JobApplication> repository, IMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<Guid> Handle(SubmitJobApplicationCommand request, CancellationToken cancellationToken)
        {
            var application = _mapper.Map<JobApplication>(request);
            application.AppliedAt = DateTime.UtcNow;
            application.ApplicationStatus = "Received";
            
            await _repository.AddAsync(application);
            return application.Id;
        }
    }
}
