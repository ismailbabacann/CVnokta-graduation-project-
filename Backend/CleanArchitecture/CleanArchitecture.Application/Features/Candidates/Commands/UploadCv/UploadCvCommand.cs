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
        private readonly IGenericRepositoryAsync<User> _userRepository;

        public UploadCvCommandHandler(
            IGenericRepositoryAsync<CvUpload> repository,
            IGenericRepositoryAsync<CandidateProfile> profileRepository,
            IGenericRepositoryAsync<User> userRepository)
        {
            _repository = repository;
            _profileRepository = profileRepository;
            _userRepository = userRepository;
        }

        public async Task<string> Handle(UploadCvCommand request, CancellationToken cancellationToken)
        {
            // CandidateProfile'ı bul
            var allProfiles = await _profileRepository.GetAllAsync();
            var profile = allProfiles.FirstOrDefault(p =>
                p.UserId == request.CandidateId || p.Id == request.CandidateId);

            bool isNewProfile = false;
            if (profile == null)
            {
                var user = await _userRepository.GetByIdAsync(request.CandidateId);
                
                profile = new CandidateProfile
                {
                    Id = Guid.NewGuid(),
                    UserId = request.CandidateId,
                    FullName = user?.FullName ?? "Bilinmeyen Aday",
                    Email = user?.Email ?? "bilinmeyen@aday.com",
                    Created = DateTime.UtcNow
                };
                isNewProfile = true;
                await _profileRepository.AddAsync(profile);
            }

            var finalUrl = !string.IsNullOrWhiteSpace(request.CloudinaryUrl)
                ? request.CloudinaryUrl
                : "uploads/" + Guid.NewGuid() + "_" + (request.FileName ?? "cv.pdf");

            var cvEntry = new CvUpload
            {
                CandidateId = profile.Id, // Doğru Foreign Key değeri: profilin kendi Id'si
                FileName    = request.FileName ?? "cv.pdf",
                FilePath    = finalUrl,
                FileSize    = request.FileContent?.Length ?? 0,
                MimeType    = request.ContentType ?? "application/pdf",
                UploadedAt  = DateTime.UtcNow,
                IsCurrent   = true
            };
            await _repository.AddAsync(cvEntry);

            // Db'deki mevcut profil nesnesine CvUrl işleniyor
            profile.CvUrl = finalUrl;
            profile.CvId  = cvEntry.Id;
            
            if (!isNewProfile)
            {
                await _profileRepository.UpdateAsync(profile);
            }
            else 
            {
                 // Zaten eklendiği için tekrar update yapıyoruz
                 await _profileRepository.UpdateAsync(profile);
            }

            return finalUrl;
        }
    }
}

