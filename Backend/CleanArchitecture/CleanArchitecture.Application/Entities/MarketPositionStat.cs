namespace CleanArchitecture.Core.Entities
{
    public class MarketPositionStat : AuditableBaseEntity
    {
        public string Name { get; set; }
        public int UsageCount { get; set; }
    }
}
