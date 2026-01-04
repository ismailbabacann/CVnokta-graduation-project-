using System;

namespace CleanArchitecture.Core.Entities
{
    public class EventLog : AuditableBaseEntity
    {
        // Inherits Guid Id from AuditableBaseEntity now
        public string EventType { get; set; }
        public string AggregateType { get; set; }
        public string AggregateId { get; set; }
        public string EventData { get; set; } 
        public DateTime CreatedAt { get; set; }
        public Guid? UserId { get; set; }
        public virtual User User { get; set; }
    }
}
