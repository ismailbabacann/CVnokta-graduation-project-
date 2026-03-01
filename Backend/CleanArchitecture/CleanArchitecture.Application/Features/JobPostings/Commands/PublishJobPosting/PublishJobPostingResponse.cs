using System;

namespace CleanArchitecture.Core.Features.JobPostings.Commands.PublishJobPosting
{
    /// <summary>
    /// PublishJobPostingCommand'a verilen yanıt.
    /// </summary>
    public class PublishJobPostingResponse
    {
        public bool Success { get; set; }

        /// <summary>Yayına alınan ilanın ID'si.</summary>
        public Guid Id { get; set; }

        /// <summary>"Active" veya "Draft"</summary>
        public string Status { get; set; }

        /// <summary>Kullanıcıya gösterilecek mesaj.</summary>
        public string Message { get; set; }
    }
}
