using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Candidates.Commands.UploadCv
{
    // Adayın CV dosyasını sisteme yüklemesini sağlar.
    public class UploadCvCommand : IRequest<string>
    {
        public Guid CandidateId { get; set; } // Updated to Guid
        public string FileName { get; set; }
        public byte[] FileContent { get; set; }
        public string ContentType { get; set; }
    }

    public class UploadCvCommandHandler : IRequestHandler<UploadCvCommand, string>
    {
        private readonly IGenericRepositoryAsync<CvUpload> _repository;

        public UploadCvCommandHandler(IGenericRepositoryAsync<CvUpload> repository)
        {
            _repository = repository;
        }

        public async Task<string> Handle(UploadCvCommand request, CancellationToken cancellationToken)
        {
            // Note: Actual file saving logic (IFileService) is omitted.
            // We just create the DB record assuming file is saved.
            
            var cvEntry = new CvUpload
            {
                CandidateId = request.CandidateId,
                FileName = request.FileName,
                FilePath = "uploads/" + Guid.NewGuid() + "_" + request.FileName,
                FileSize = request.FileContent?.Length ?? 0,
                MimeType = request.ContentType,
                UploadedAt = DateTime.UtcNow,
                IsCurrent = true
            };
            
            await _repository.AddAsync(cvEntry);
            return cvEntry.FilePath;
        }
    }
}
