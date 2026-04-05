namespace CleanArchitecture.Core.Entities
{
    public class MarketSkillStat : AuditableBaseEntity
    {
        public string Name { get; set; }
        public int UsageCount { get; set; }
    }
}
