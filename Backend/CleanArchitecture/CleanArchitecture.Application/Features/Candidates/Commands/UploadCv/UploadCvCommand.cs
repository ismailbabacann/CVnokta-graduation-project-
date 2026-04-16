using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Candidates.Commands.UploadCv
{
    // Allows a candidate to save their CV URL (uploaded via Cloudinary on the frontend).
    public class UploadCvCommand : IRequest<string>
    {
        public Guid CandidateId { get; set; }
        public string FileName { get; set; }
        public byte[] FileContent { get; set; }
        public string ContentType { get; set; }
        /// <summary>
        /// Ön yüzden Cloudinary'e yüklendikten sonra alınan tam URL.
        /// Boş geçilirse eski mock davranış korunur.
        /// </summary>
        public string CloudinaryUrl { get; set; }
    }

    public class UploadCvCommandHandler : IRequestHandler<UploadCvCommand, string>
    {
        private readonly IGenericRepositoryAsync<CvUpload> _repository;
        private readonly IGenericRepositoryAsync<CandidateProfile> _profileRepository;

        public UploadCvCommandHandler(
            IGenericRepositoryAsync<CvUpload> repository,
            IGenericRepositoryAsync<CandidateProfile> profileRepository)
        {
            _repository = repository;
            _profileRepository = profileRepository;
        }

        public async Task<string> Handle(UploadCvCommand request, CancellationToken cancellationToken)
        {
            // Öncelik: Frontend tarafından gönderilen Cloudinary URL kullan.
            // Eğer yoksa dosya içeriğinden mock path oluştur (geliştirme fallback'i).
            var finalUrl = !string.IsNullOrWhiteSpace(request.CloudinaryUrl)
                ? request.CloudinaryUrl
                : "uploads/" + Guid.NewGuid() + "_" + (request.FileName ?? "cv.pdf");

            var cvEntry = new CvUpload
            {
                CandidateId = request.CandidateId,
                FileName    = request.FileName ?? "cv.pdf",
                FilePath    = finalUrl,
                FileSize    = request.FileContent?.Length ?? 0,
                MimeType    = request.ContentType ?? "application/pdf",
                UploadedAt  = DateTime.UtcNow,
                IsCurrent   = true
            };
            await _repository.AddAsync(cvEntry);

            // CandidateProfile'ı bul ve CvUrl'i güncelle
            var allProfiles = await _profileRepository.GetAllAsync();
            var profile = allProfiles.FirstOrDefault(p =>
                p.UserId == request.CandidateId || p.Id == request.CandidateId);

            if (profile != null)
            {
                profile.CvUrl = finalUrl;
                profile.CvId  = cvEntry.Id;
                await _profileRepository.UpdateAsync(profile);
            }

            return finalUrl;
        }
    }
}

