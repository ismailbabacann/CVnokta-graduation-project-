import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './JobView.css';

function JobView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`https://localhost:9001/api/v1/JobPostings/public/${id}`);
        setJob(response.data.data || response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching job details:', err);
        setError('İş ilanı bulunamadı veya bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchJobDetails();
  }, [id]);

  const handleApplyClick = () => {
    navigate(`/apply/${id}`);
    window.scrollTo(0, 0);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '100px' }}>Yükleniyor...</div>;
  }

  if (error || !job) {
    return <div style={{ textAlign: 'center', padding: '100px', color: 'red' }}>{error || 'İlan bulunamadı.'}</div>;
  }

  return (
    <div className="jobview-container">
      <section className="job-header">
        <h1>{job.jobTitle}</h1>
        <p className="job-department">{job.department}</p>
        <div className="job-meta">
          <span>📍 {job.location}</span>
          <span>💼 {job.workType}</span>
          <span>🌍 {job.workModel}</span>
        </div>
      </section>

      <section className="job-section">
        <h2>About Company</h2>
        <p style={{ whiteSpace: 'pre-line' }}>{job.aboutCompany}</p>
      </section>

      <section className="job-section">
        <h2>About the Role</h2>
        <p style={{ whiteSpace: 'pre-line' }}>{job.aboutRole}</p>
      </section>

      <section className="job-section">
        <h2>Responsibilities</h2>
        <p style={{ whiteSpace: 'pre-line' }}>{job.responsibilities}</p>
      </section>

      <section className="job-section">
        <h2>Required Qualifications</h2>
        <p style={{ whiteSpace: 'pre-line' }}>{job.requiredQualifications}</p>
      </section>

      {job.benefits && job.benefits.length > 0 && (
        <section className="job-section">
          <h2>Benefits</h2>
          <div className="benefits-grid">
            {job.benefits.map((benefit, idx) => (
              <div key={idx} className="benefit-card">
                <h3>🌟 {benefit}</h3>
              </div>
            ))}
          </div>
        </section>
      )}

      <button className="apply-button" onClick={handleApplyClick}>
        Apply for this Job
      </button>
    </div>
  );
}

export default JobView;
