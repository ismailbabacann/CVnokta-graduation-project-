using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Applications.Queries.GetApplicationsByJobId
{
    // İK'nın belirli bir ilana gelen tüm başvuruları listelemesini sağlar.
    public class GetApplicationsByJobIdQuery : IRequest<IEnumerable<JobApplication>>
    {
        public Guid JobPostingId { get; set; }
    }

    public class GetApplicationsByJobIdQueryHandler : IRequestHandler<GetApplicationsByJobIdQuery, IEnumerable<JobApplication>>
    {
        private readonly IGenericRepositoryAsync<JobApplication> _repository;

        public GetApplicationsByJobIdQueryHandler(IGenericRepositoryAsync<JobApplication> repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<JobApplication>> Handle(GetApplicationsByJobIdQuery request, CancellationToken cancellationToken)
        {
            var all = await _repository.GetAllAsync();
            var list = new List<JobApplication>();
            foreach(var a in all)
            {
                if(a.JobPostingId == request.JobPostingId)
                    list.Add(a);
            }
            return list;
        }
    }
}
