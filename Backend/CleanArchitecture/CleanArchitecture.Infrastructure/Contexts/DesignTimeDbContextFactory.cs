using CleanArchitecture.Core.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using System;
using System.IO;

namespace CleanArchitecture.Infrastructure.Contexts
{
    public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
    {
        public ApplicationDbContext CreateDbContext(string[] args)
        {
            IConfigurationRoot configuration = new ConfigurationBuilder()
                .SetBasePath(Path.Combine(Directory.GetCurrentDirectory(), "../CleanArchitecture.WebApi"))
                .AddJsonFile("appsettings.json")
                .AddJsonFile("appsettings.Development.json", optional: true)
                .Build();

            var builder = new DbContextOptionsBuilder<ApplicationDbContext>();
            var connectionString = configuration.GetConnectionString("DefaultConnection");

            builder.UseSqlServer(connectionString, b => b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName));

            return new ApplicationDbContext(builder.Options, new DateTimeServiceStub(), new AuthenticatedUserServiceStub());
        }

        private class DateTimeServiceStub : IDateTimeService
        {
            public DateTime NowUtc => DateTime.UtcNow;
        }

        private class AuthenticatedUserServiceStub : IAuthenticatedUserService
        {
            public string UserId => "system-migration-user";
        }
    }
}
