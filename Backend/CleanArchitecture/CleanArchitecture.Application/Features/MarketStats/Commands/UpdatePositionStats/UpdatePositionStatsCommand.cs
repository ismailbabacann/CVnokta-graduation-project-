using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.MarketStats.Commands.UpdatePositionStats
{
    public class UpdatePositionStatsCommand : IRequest<int>
    {
        public List<string> Positions { get; set; }
    }

    public class UpdatePositionStatsCommandHandler : IRequestHandler<UpdatePositionStatsCommand, int>
    {
        private readonly IGenericRepositoryAsync<MarketPositionStat> _positionRepository;

        public UpdatePositionStatsCommandHandler(IGenericRepositoryAsync<MarketPositionStat> positionRepository)
        {
            _positionRepository = positionRepository;
        }

        public async Task<int> Handle(UpdatePositionStatsCommand request, CancellationToken cancellationToken)
        {
            if (request.Positions == null || !request.Positions.Any())
                return 0;

            var allStats = await _positionRepository.GetAllAsync();
            int processedCount = 0;

            foreach (var rawPosition in request.Positions)
            {
                if (string.IsNullOrWhiteSpace(rawPosition)) continue;

                string standardized = rawPosition.Trim().ToUpper();

                var existing = allStats.FirstOrDefault(x => x.Name == standardized);

                if (existing != null)
                {
                    existing.UsageCount += 1;
                    await _positionRepository.UpdateAsync(existing);
                }
                else
                {
                    var newStat = new MarketPositionStat
                    {
                        Name = standardized,
                        UsageCount = 1
                    };
                    await _positionRepository.AddAsync(newStat);
                }

                processedCount++;
            }

            return processedCount;
        }
    }
}
