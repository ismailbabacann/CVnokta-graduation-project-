using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.Interviews.Commands.SubmitAiInterviewAnswer
{
    // Saves the candidate's answer to an interview question (text or audio file path).
    public class SubmitAiInterviewAnswerCommand : IRequest<bool>
    {
        public Guid SessionId { get; set; }
        public int QuestionSequence { get; set; }
        public string AnswerText { get; set; }
        public string AudioUrl { get; set; }
    }

    public class SubmitAiInterviewAnswerCommandHandler : IRequestHandler<SubmitAiInterviewAnswerCommand, bool>
    {
        private readonly IGenericRepositoryAsync<AiInterviewQa> _repository;

        public SubmitAiInterviewAnswerCommandHandler(IGenericRepositoryAsync<AiInterviewQa> repository)
        {
            _repository = repository;
        }

        public async Task<bool> Handle(SubmitAiInterviewAnswerCommand request, CancellationToken cancellationToken)
        {
            var qa = new AiInterviewQa
            {
                SessionId = request.SessionId,
                QuestionSequence = request.QuestionSequence,
                CandidateAnswerText = request.AnswerText,
                CandidateAnswerAudioPath = request.AudioUrl,
                AnsweredAt = DateTime.UtcNow
            };
            await _repository.AddAsync(qa);
            return true;
        }
    }
}
