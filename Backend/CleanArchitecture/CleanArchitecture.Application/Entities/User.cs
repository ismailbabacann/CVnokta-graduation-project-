using System;
using System.Collections.Generic;

namespace CleanArchitecture.Core.Entities
{
    public class User : AuditableBaseEntity
    {
        public string Email { get; set; }
        public string PasswordHash { get; set; }
        public string UserType { get; set; }
        public string FullName { get; set; }
        public string Phone { get; set; }
        public bool IsActive { get; set; }
    }
}
