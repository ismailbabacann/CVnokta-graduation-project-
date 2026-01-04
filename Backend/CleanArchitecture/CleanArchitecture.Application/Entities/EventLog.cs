using System;

namespace CleanArchitecture.Core.Entities
{
    public class EventLog : BaseEntity
    {
        // Note: Id is BIGINT in SQL, but BaseEntity has int Id. 
        // We might need to override it or create a separate BaseEntity if BIGINT is strictly required. 
        // For now, assuming int is sufficient or user will adjust if needed, 
        // but given SQL schema says BIGINT, I'll use long and hide base Member if necessary or just not inherit BaseEntity.
        // Looking at BaseEntity, it has virtual int Id.
        // I will not inherit from BaseEntity to transparently support long Id.
        
        public long Id { get; set; }
        public string EventType { get; set; }
        public string AggregateType { get; set; }
        public int AggregateId { get; set; }
        public string EventData { get; set; } // JSON stored as string
        public DateTime CreatedAt { get; set; }
        public int? UserId { get; set; }
        public virtual User User { get; set; }
    }
}
