using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.MarketStats.Commands.UpdateSkillStats
{
    public class UpdateSkillStatsCommand : IRequest<int>
    {
        public List<string> Skills { get; set; }
    }

    public class UpdateSkillStatsCommandHandler : IRequestHandler<UpdateSkillStatsCommand, int>
    {
        private readonly IGenericRepositoryAsync<MarketSkillStat> _skillRepository;

        public UpdateSkillStatsCommandHandler(IGenericRepositoryAsync<MarketSkillStat> skillRepository)
        {
            _skillRepository = skillRepository;
        }

        public async Task<int> Handle(UpdateSkillStatsCommand request, CancellationToken cancellationToken)
        {
            if (request.Skills == null || !request.Skills.Any())
                return 0;

            // Get all existing stats once
            var allStats = await _skillRepository.GetAllAsync();
            int processedCount = 0;

            foreach (var rawSkill in request.Skills)
            {
                if (string.IsNullOrWhiteSpace(rawSkill)) continue;

                // Standardize: Trim and ToUpper as requested
                string standardized = rawSkill.Trim().ToUpper();

                var existing = allStats.FirstOrDefault(x => x.Name == standardized);

                if (existing != null)
                {
                    existing.UsageCount += 1;
                    await _skillRepository.UpdateAsync(existing);
                }
                else
                {
                    var newStat = new MarketSkillStat
                    {
                        Name = standardized,
                        UsageCount = 1
                    };
                    await _skillRepository.AddAsync(newStat);
                }

                processedCount++;
            }

            return processedCount;
        }
    }
}
