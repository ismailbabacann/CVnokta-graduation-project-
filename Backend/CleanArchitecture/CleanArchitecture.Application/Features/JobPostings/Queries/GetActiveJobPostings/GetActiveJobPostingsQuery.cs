using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.JobPostings.Queries.GetActiveJobPostings
{
    // Adayların başvurabileceği aktif iş ilanlarını listeler.
    public class GetActiveJobPostingsQuery : IRequest<IEnumerable<ActiveJobPostingsView>>
    {
        // Filters can be added here
    }

    public class GetActiveJobPostingsQueryHandler : IRequestHandler<GetActiveJobPostingsQuery, IEnumerable<ActiveJobPostingsView>>
    {
        private readonly IGenericRepositoryAsync<ActiveJobPostingsView> _viewRepository;

        public GetActiveJobPostingsQueryHandler(IGenericRepositoryAsync<ActiveJobPostingsView> viewRepository)
        {
            _viewRepository = viewRepository;
        }

        public async Task<IEnumerable<ActiveJobPostingsView>> Handle(GetActiveJobPostingsQuery request, CancellationToken cancellationToken)
        {
            // Since it's a view, GetAllAsync should retrieve the view contents.
            // Assumption: The view is pre-filtered or we filter in memory if "Active" isn't implied by the view name.
            // But the view name "ActiveJobPostingsView" suggests it only contains active ones.
            return await _viewRepository.GetAllAsync();
        }
    }
}
