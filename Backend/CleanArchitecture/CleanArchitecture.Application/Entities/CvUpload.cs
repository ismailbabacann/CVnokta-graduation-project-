using System;

namespace CleanArchitecture.Core.Entities
{
    public class CvUpload : AuditableBaseEntity
    {
        public Guid CandidateId { get; set; }
        public string FileName { get; set; }
        public string FilePath { get; set; }
        public int? FileSize { get; set; }
        public string MimeType { get; set; }
        public DateTime UploadedAt { get; set; }
        public bool IsCurrent { get; set; }
        public virtual CandidateProfile CandidateProfile { get; set; }
    }
}
