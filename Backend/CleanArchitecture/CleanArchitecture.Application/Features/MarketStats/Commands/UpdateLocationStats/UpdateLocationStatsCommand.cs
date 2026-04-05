using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.MarketStats.Commands.UpdateLocationStats
{
    public class UpdateLocationStatsCommand : IRequest<int>
    {
        public List<string> Locations { get; set; }
    }

    public class UpdateLocationStatsCommandHandler : IRequestHandler<UpdateLocationStatsCommand, int>
    {
        private readonly IGenericRepositoryAsync<MarketLocationStat> _locationRepository;

        public UpdateLocationStatsCommandHandler(IGenericRepositoryAsync<MarketLocationStat> locationRepository)
        {
            _locationRepository = locationRepository;
        }

        public async Task<int> Handle(UpdateLocationStatsCommand request, CancellationToken cancellationToken)
        {
            if (request.Locations == null || !request.Locations.Any())
                return 0;

            var allStats = await _locationRepository.GetAllAsync();
            int processedCount = 0;

            foreach (var rawLocation in request.Locations)
            {
                if (string.IsNullOrWhiteSpace(rawLocation)) continue;

                string standardized = rawLocation.Trim().ToUpper();

                var existing = allStats.FirstOrDefault(x => x.Name == standardized);

                if (existing != null)
                {
                    existing.UsageCount += 1;
                    await _locationRepository.UpdateAsync(existing);
                }
                else
                {
                    var newStat = new MarketLocationStat
                    {
                        Name = standardized,
                        UsageCount = 1
                    };
                    await _locationRepository.AddAsync(newStat);
                }

                processedCount++;
            }

            return processedCount;
        }
    }
}
