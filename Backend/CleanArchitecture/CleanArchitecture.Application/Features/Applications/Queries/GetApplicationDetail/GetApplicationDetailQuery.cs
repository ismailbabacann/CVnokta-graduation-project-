using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Applications.Queries.GetApplicationDetail
{
    // Returns the details of a single application (CV, Test Results, Interview Status, etc.).
    public class GetApplicationDetailQuery : IRequest<ApplicationDetailViewModel>
    {
        public Guid ApplicationId { get; set; }
    }

    public class ApplicationDetailViewModel
    {
        public JobApplication Application { get; set; }
        // Other aggreagated details like Test Results, Interviews etc.
    }

    public class GetApplicationDetailQueryHandler : IRequestHandler<GetApplicationDetailQuery, ApplicationDetailViewModel>
    {
        private readonly IGenericRepositoryAsync<JobApplication> _repository;

        public GetApplicationDetailQueryHandler(IGenericRepositoryAsync<JobApplication> repository)
        {
            _repository = repository;
        }

        public async Task<ApplicationDetailViewModel> Handle(GetApplicationDetailQuery request, CancellationToken cancellationToken)
        {
            var app = await _repository.GetByIdAsync(request.ApplicationId);
            return new ApplicationDetailViewModel { Application = app };
        }
    }
}
