using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Applications.Queries.GetApplicationDetail
{
    // Tek bir başvurunun detaylarını (CV, Test Sonuçları, Mülakat Durumu vb.) getirir.
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
