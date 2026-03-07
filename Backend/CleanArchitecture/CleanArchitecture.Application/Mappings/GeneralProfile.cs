using AutoMapper;
using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Features.JobPostings.Commands.CreateJobPosting;
using CleanArchitecture.Core.Features.Candidates.Commands.CreateCandidateProfile;
using CleanArchitecture.Core.Features.Applications.Commands.SubmitJobApplication;
using CleanArchitecture.Core.Features.Interviews.Commands.StartAiInterview;

namespace CleanArchitecture.Core.Mappings
{
    public class GeneralProfile : Profile
    {
        public GeneralProfile()
        {
            // JobPostings
            CreateMap<CreateJobPostingCommand, JobPosting>()
                .ForMember(dest => dest.Benefits,        opt => opt.Ignore())
                .ForMember(dest => dest.Status,          opt => opt.Ignore())
                .ForMember(dest => dest.IsDraft,         opt => opt.Ignore())
                .ForMember(dest => dest.PostedDate,      opt => opt.Ignore())
                .ForMember(dest => dest.HiringManagerId, opt => opt.Ignore());

            // Candidates
            CreateMap<CreateCandidateProfileCommand, CandidateProfile>();

            // Applications
            CreateMap<SubmitJobApplicationCommand, JobApplication>();

            // Interviews
            CreateMap<StartAiInterviewCommand, AiInterviewSession>();
        }
    }
}
