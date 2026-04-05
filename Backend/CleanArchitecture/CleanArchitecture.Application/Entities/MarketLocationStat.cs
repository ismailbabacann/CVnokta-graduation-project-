namespace CleanArchitecture.Core.Entities
{
    public class MarketLocationStat : AuditableBaseEntity
    {
        public string Name { get; set; }
        public int UsageCount { get; set; }
    }
}
