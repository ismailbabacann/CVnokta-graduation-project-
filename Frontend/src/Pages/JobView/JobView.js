import React from 'react';
import './JobView.css';

function JobView({ job, onApply }) {
  return (
    <div className="jobview-container">
      <section className="job-header">
        <h1>{job.position}</h1>
        <p className="job-department">{job.department}</p>
        <div className="job-meta">
          <span>📍 {job.location}</span>
          <span>💼 {job.type}</span>
          <span>🌍 {job.workMode}</span>
        </div>
      </section>

      <section className="job-section">
        <h2>Hakkımızda</h2>
        <p>{job.aboutCompany}</p>
      </section>

      <section className="job-section">
        <h2>Rol Hakkında</h2>
        <p>{job.aboutRole}</p>
      </section>

      <section className="job-section">
        <h2>Sorumluluklar</h2>
        <ul>
          {job.responsibilities.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="job-section">
        <h2>Beklenen Nitelikler</h2>
        <ul>
          {job.qualifications.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="job-section">
        <h2>Sunduğumuz Faydalar</h2>
        <div className="benefits-grid">
          {job.benefits.map((benefit, idx) => (
            <div key={idx} className="benefit-card">
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </div>
          ))}
        </div>
      </section>

      <button className="apply-button" onClick={onApply}>
        Bu İşe Başvur
      </button>
    </div>
  );
}

export default JobView;
