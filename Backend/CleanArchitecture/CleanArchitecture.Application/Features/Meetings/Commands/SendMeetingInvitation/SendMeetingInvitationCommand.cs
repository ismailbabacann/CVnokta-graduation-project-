using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Meetings.Commands.SendMeetingInvitation
{
    // Uygun görülen adaya toplantı/mülakat daveti gönderir.
    public class SendMeetingInvitationCommand : IRequest<Guid>
    {
        public Guid ApplicationId { get; set; }
        public Guid CandidateId { get; set; }
        public string MeetingTitle { get; set; }
        public DateTime ScheduledDate { get; set; }
        public string MeetingLink { get; set; }
    }

    public class SendMeetingInvitationCommandHandler : IRequestHandler<SendMeetingInvitationCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<MeetingInvitation> _repository;
        private readonly IGenericRepositoryAsync<JobApplication> _appRepository;
        private readonly IAuthenticatedUserService _authenticatedUserService;

        public SendMeetingInvitationCommandHandler(
            IGenericRepositoryAsync<MeetingInvitation> repository,
            IGenericRepositoryAsync<JobApplication> appRepository,
            IAuthenticatedUserService authenticatedUserService)
        {
            _repository = repository;
            _appRepository = appRepository;
            _authenticatedUserService = authenticatedUserService;
        }

        public async Task<Guid> Handle(SendMeetingInvitationCommand request, CancellationToken cancellationToken)
        {
             var app = await _appRepository.GetByIdAsync(request.ApplicationId);
             if(app == null) throw new Exception("Application not found");

            var meeting = new MeetingInvitation
            {
                ApplicationId = request.ApplicationId,
                CandidateId = request.CandidateId,
                MeetingTitle = request.MeetingTitle,
                ScheduledDate = request.ScheduledDate,
                MeetingLink = request.MeetingLink,
                InvitationStatus = "Sent",
                SentAt = DateTime.UtcNow,
                JobPostingId = app.JobPostingId,
                // Valid CreatedById as Guid
                CreatedById = Guid.Parse(_authenticatedUserService.UserId) 
            };
            
            await _repository.AddAsync(meeting);
            return meeting.Id;
        }
    }
}
