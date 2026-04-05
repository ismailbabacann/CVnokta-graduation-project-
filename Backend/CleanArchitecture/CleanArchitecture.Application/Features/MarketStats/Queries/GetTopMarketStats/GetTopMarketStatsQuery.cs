using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.MarketStats.Queries.GetTopMarketStats
{
    public class GetTopMarketStatsQuery : IRequest<TopMarketStatsDto>
    {
        public int TopN { get; set; } = 10;
    }

    public class TopMarketStatsDto
    {
        public List<StatItemDto> TopSkills { get; set; }
        public List<StatItemDto> TopPositions { get; set; }
        public List<StatItemDto> TopLocations { get; set; }
    }

    public class StatItemDto
    {
        public string Name { get; set; }
        public int UsageCount { get; set; }
    }

    public class GetTopMarketStatsQueryHandler : IRequestHandler<GetTopMarketStatsQuery, TopMarketStatsDto>
    {
        private readonly IGenericRepositoryAsync<MarketSkillStat> _skillRepository;
        private readonly IGenericRepositoryAsync<MarketPositionStat> _positionRepository;
        private readonly IGenericRepositoryAsync<MarketLocationStat> _locationRepository;

        public GetTopMarketStatsQueryHandler(
            IGenericRepositoryAsync<MarketSkillStat> skillRepository,
            IGenericRepositoryAsync<MarketPositionStat> positionRepository,
            IGenericRepositoryAsync<MarketLocationStat> locationRepository)
        {
            _skillRepository = skillRepository;
            _positionRepository = positionRepository;
            _locationRepository = locationRepository;
        }

        public async Task<TopMarketStatsDto> Handle(GetTopMarketStatsQuery request, CancellationToken cancellationToken)
        {
            var skills = await _skillRepository.GetAllAsync();
            var positions = await _positionRepository.GetAllAsync();
            var locations = await _locationRepository.GetAllAsync();

            return new TopMarketStatsDto
            {
                TopSkills = skills
                    .OrderByDescending(x => x.UsageCount)
                    .Take(request.TopN)
                    .Select(x => new StatItemDto { Name = x.Name, UsageCount = x.UsageCount })
                    .ToList(),

                TopPositions = positions
                    .OrderByDescending(x => x.UsageCount)
                    .Take(request.TopN)
                    .Select(x => new StatItemDto { Name = x.Name, UsageCount = x.UsageCount })
                    .ToList(),

                TopLocations = locations
                    .OrderByDescending(x => x.UsageCount)
                    .Take(request.TopN)
                    .Select(x => new StatItemDto { Name = x.Name, UsageCount = x.UsageCount })
                    .ToList()
            };
        }
    }
}
