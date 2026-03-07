using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Interviews.Commands.BulkInviteToInterview
{
    public class BulkInviteToInterviewCommandHandler : IRequestHandler<BulkInviteToInterviewCommand, bool>
    {
        private readonly IGenericRepositoryAsync<JobApplication> _applicationRepository;
        private readonly IGenericRepositoryAsync<MeetingInvitation> _meetingRepository;

        public BulkInviteToInterviewCommandHandler(
            IGenericRepositoryAsync<JobApplication> applicationRepository,
            IGenericRepositoryAsync<MeetingInvitation> meetingRepository)
        {
            _applicationRepository = applicationRepository;
            _meetingRepository = meetingRepository;
        }

        public async Task<bool> Handle(BulkInviteToInterviewCommand request, CancellationToken cancellationToken)
        {
            if (request.ApplicationIds == null || request.ApplicationIds.Count == 0)
                return false;

            foreach (var id in request.ApplicationIds)
            {
                var app = await _applicationRepository.GetByIdAsync(id);
                if (app != null && app.ApplicationStatus != "INTERVIEW_INVITED")
                {
                    app.ApplicationStatus = "INTERVIEW_INVITED";
                    await _applicationRepository.UpdateAsync(app);

                    var meeting = new MeetingInvitation
                    {
                        ApplicationId = app.Id,
                        JobPostingId = app.JobPostingId,
                        CandidateId = app.CandidateId,
                        MeetingType = "FINAL_INTERVIEW",
                        InvitationStatus = "PENDING",
                        MeetingTitle = "Bulk Interview Invitation",
                        ScheduledDate = DateTime.UtcNow.AddDays(3) // Example default
                    };
                    await _meetingRepository.AddAsync(meeting);
                }
            }

            return true;
        }
    }
}
