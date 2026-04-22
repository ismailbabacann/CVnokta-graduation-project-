using AutoMapper;
using CleanArchitecture.Core.Entities;
using CleanArchitecture.Core.Interfaces;
using MediatR;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace CleanArchitecture.Core.Features.JobPostings.Commands.UpdateJobPosting
{
    public class UpdateJobPostingCommand : IRequest<UpdateJobPostingResponse>
    {
        public Guid Id { get; set; }
        public string JobTitle { get; set; }
        public string Department { get; set; }
        public string Location { get; set; }
        public string WorkType { get; set; }
        public string WorkModel { get; set; }
        public string AboutCompany { get; set; }
        public string AboutRole { get; set; }
        public string Responsibilities { get; set; }
        public string RequiredQualifications { get; set; }
        public string RequiredSkills { get; set; }
        public bool AiScanEnabled { get; set; }
        public int MinMatchScore { get; set; } = 70;
        public bool AutoEmailEnabled { get; set; }
        public List<string> Benefits { get; set; } = new List<string>();
        public decimal? SalaryMin { get; set; }
        public decimal? SalaryMax { get; set; }
        public int TotalPositions { get; set; } = 1;
        public bool SaveAsDraft { get; set; }
    }

    public class UpdateJobPostingResponse
    {
        public Guid Id { get; set; }
        public bool Success { get; set; }
        public string Message { get; set; }
    }

    public class UpdateJobPostingCommandHandler : IRequestHandler<UpdateJobPostingCommand, UpdateJobPostingResponse>
    {
        private readonly IGenericRepositoryAsync<JobPosting> _repository;

        public UpdateJobPostingCommandHandler(IGenericRepositoryAsync<JobPosting> repository)
        {
            _repository = repository;
        }

        public async Task<UpdateJobPostingResponse> Handle(UpdateJobPostingCommand request, CancellationToken cancellationToken)
        {
            var job = await _repository.GetByIdAsync(request.Id);
            if (job == null)
            {
                return new UpdateJobPostingResponse { Success = false, Message = "İlan bulunamadı." };
            }

            job.JobTitle = request.JobTitle;
            job.Department = request.Department;
            job.Location = request.Location;
            job.WorkType = request.WorkType;
            job.WorkModel = request.WorkModel;
            job.AboutCompany = request.AboutCompany;
            job.AboutRole = request.AboutRole;
            job.Responsibilities = request.Responsibilities;
            job.RequiredQualifications = request.RequiredQualifications;
            job.RequiredSkills = request.RequiredSkills;
            job.Benefits = request.Benefits != null ? string.Join(",", request.Benefits) : string.Empty;
            
            job.Status = request.SaveAsDraft ? "Draft" : "Active";
            job.IsDraft = request.SaveAsDraft;

            await _repository.UpdateAsync(job);

            return new UpdateJobPostingResponse
            {
                Id = job.Id,
                Success = true,
                Message = "İlan güncellendi."
            };
        }
    }
}
