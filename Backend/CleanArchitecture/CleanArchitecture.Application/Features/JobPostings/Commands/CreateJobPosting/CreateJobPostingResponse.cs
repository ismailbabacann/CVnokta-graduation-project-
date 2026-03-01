using System;

namespace CleanArchitecture.Core.Features.JobPostings.Commands.CreateJobPosting
{
    /// <summary>
    /// CreateJobPostingCommand'a verilen yanıt.
    /// </summary>
    public class CreateJobPostingResponse
    {
        /// <summary>Oluşturulan iş ilanının benzersiz kimliği.</summary>
        public Guid Id { get; set; }

        /// <summary>"Active" veya "Draft"</summary>
        public string Status { get; set; }

        /// <summary>Taslak olarak kaydedildi mi?</summary>
        public bool IsDraft { get; set; }

        /// <summary>Kullanıcıya gösterilecek başarı mesajı.</summary>
        public string Message { get; set; }
    }
}
