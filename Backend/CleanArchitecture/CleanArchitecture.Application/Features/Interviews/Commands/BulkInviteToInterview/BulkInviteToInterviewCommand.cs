using MediatR;
using System;
using System.Collections.Generic;

namespace CleanArchitecture.Core.Features.Interviews.Commands.BulkInviteToInterview
{
    public class BulkInviteToInterviewCommand : IRequest<bool>
    {
        public List<Guid> ApplicationIds { get; set; }
    }
}
