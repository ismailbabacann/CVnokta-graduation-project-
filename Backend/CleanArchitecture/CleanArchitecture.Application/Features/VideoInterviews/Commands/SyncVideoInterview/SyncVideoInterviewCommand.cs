using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.VideoInterviews.Commands.SyncVideoInterview
{
    public class SyncVideoInterviewCommand : IRequest<Guid>
    {
        public string ExternalInterviewId { get; set; }
        public Guid CandidateId { get; set; }
        public Guid JobPostingId { get; set; }
        public string Status { get; set; }
        
        public List<SyncVideoInterviewQaDto> Questions { get; set; } = new List<SyncVideoInterviewQaDto>();
    }

    public class SyncVideoInterviewQaDto
    {
        public string QuestionText { get; set; }
        public string AnswerText { get; set; }
        public string VideoUrl { get; set; }
    }

    public class SyncVideoInterviewCommandHandler : IRequestHandler<SyncVideoInterviewCommand, Guid>
    {
        private readonly IGenericRepositoryAsync<VideoInterview> _videoInterviewRepository;

        public SyncVideoInterviewCommandHandler(IGenericRepositoryAsync<VideoInterview> videoInterviewRepository)
        {
            _videoInterviewRepository = videoInterviewRepository;
        }

        public async Task<Guid> Handle(SyncVideoInterviewCommand request, CancellationToken cancellationToken)
        {
            var interview = new VideoInterview
            {
                ExternalInterviewId = request.ExternalInterviewId,
                CandidateId = request.CandidateId,
                JobPostingId = request.JobPostingId,
                Status = request.Status ?? "Completed",
                Questions = request.Questions.Select(q => new VideoInterviewQa
                {
                    QuestionText = q.QuestionText,
                    AnswerText = q.AnswerText,
                    VideoUrl = q.VideoUrl
                }).ToList()
            };

            await _videoInterviewRepository.AddAsync(interview);

            return interview.Id;
        }
    }
}
