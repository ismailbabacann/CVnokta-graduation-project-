using CleanArchitecture.Core.Wrappers;
using MediatR;
using System;
using System.Collections.Generic;

namespace CleanArchitecture.Core.Features.Applications.Commands.BulkUpdateApplicationStatus
{
    public class BulkUpdateApplicationStatusCommand : IRequest<bool>
    {
        public List<Guid> ApplicationIds { get; set; }
        public string NewStatus { get; set; }
    }
}
