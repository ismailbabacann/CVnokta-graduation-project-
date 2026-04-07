using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Candidates.Commands.UpdateCandidateProfile
{
    // ─────────────────────────────────────────────────────────────────────────
    // DTO
    // ─────────────────────────────────────────────────────────────────────────
    public class UpdateCandidateProfileResponse
    {
        public bool Succeeded { get; set; }
        public string Message { get; set; }
        public object Data { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Command
    // ─────────────────────────────────────────────────────────────────────────
    /// <summary>
    /// Adayın profil bilgilerini günceller.
    /// PUT /api/v1/Candidates/{userId}
    /// </summary>
    public class UpdateCandidateProfileCommand : IRequest<UpdateCandidateProfileResponse>
    {
        /// <summary>Route'dan set edilir (controller tarafında).</summary>
        public Guid UserId { get; set; }

        public string FullName { get; set; }
        public string Email { get; set; }
        public string Phone { get; set; }
        public string Location { get; set; }
        public string Summary { get; set; }
        public int? ExperienceYears { get; set; }
        public string EducationLevel { get; set; }
        public string LinkedInProfile { get; set; }
        public string CurrentCompany { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Handler
    // ─────────────────────────────────────────────────────────────────────────
    public class UpdateCandidateProfileCommandHandler
        : IRequestHandler<UpdateCandidateProfileCommand, UpdateCandidateProfileResponse>
    {
        private readonly IGenericRepositoryAsync<CandidateProfile> _profileRepo;
        private readonly IGenericRepositoryAsync<User> _userRepo;

        public UpdateCandidateProfileCommandHandler(
            IGenericRepositoryAsync<CandidateProfile> profileRepo,
            IGenericRepositoryAsync<User> userRepo)
        {
            _profileRepo = profileRepo;
            _userRepo = userRepo;
        }

        public async Task<UpdateCandidateProfileResponse> Handle(
            UpdateCandidateProfileCommand request, CancellationToken cancellationToken)
        {
            // 1. CandidateProfile'ı bul
            var allProfiles = await _profileRepo.GetAllAsync();
            var profile = allProfiles.FirstOrDefault(p => p.UserId == request.UserId);

            if (profile == null)
            {
                return new UpdateCandidateProfileResponse
                {
                    Succeeded = false,
                    Message = "Aday profili bulunamadı."
                };
            }

            // 2. Profil alanlarını güncelle
            profile.FullName = request.FullName ?? profile.FullName;
            profile.Email = request.Email ?? profile.Email;
            profile.Phone = request.Phone ?? profile.Phone;
            profile.Location = request.Location ?? profile.Location;
            profile.Summary = request.Summary ?? profile.Summary;
            profile.ExperienceYears = request.ExperienceYears ?? profile.ExperienceYears;
            profile.EducationLevel = request.EducationLevel ?? profile.EducationLevel;
            profile.LinkedInProfile = request.LinkedInProfile ?? profile.LinkedInProfile;
            profile.CurrentCompany = request.CurrentCompany ?? profile.CurrentCompany;
            profile.LastModified = DateTime.UtcNow;

            await _profileRepo.UpdateAsync(profile);

            // 3. Domain User tablosundaki bilgileri de güncelle
            var user = await _userRepo.GetByIdAsync(request.UserId);
            if (user != null)
            {
                user.FullName = request.FullName ?? user.FullName;
                user.Email = request.Email ?? user.Email;
                user.Phone = request.Phone ?? user.Phone;
                user.LastModified = DateTime.UtcNow;
                await _userRepo.UpdateAsync(user);
            }

            return new UpdateCandidateProfileResponse
            {
                Succeeded = true,
                Message = "Profil başarıyla güncellendi.",
                Data = new
                {
                    profile.Id,
                    profile.FullName,
                    profile.Email,
                    profile.Phone,
                    profile.Location,
                    profile.Summary,
                    profile.ExperienceYears,
                    profile.EducationLevel,
                    profile.LinkedInProfile,
                    profile.CurrentCompany
                }
            };
        }
    }
}
