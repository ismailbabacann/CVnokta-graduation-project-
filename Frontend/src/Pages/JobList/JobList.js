import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './JobList.css';
import jobLogo from '../../assets/job_logo.png';

function JobList() {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                // Public endpoint, no token required
                const response = await axios.get('https://localhost:9001/api/v1/JobPostings/public');

                if (response.data && response.data.data) {
                    setJobs(response.data.data);
                } else if (Array.isArray(response.data)) {
                    setJobs(response.data);
                } else {
                    setJobs([]);
                }

                setError(null);
            } catch (err) {
                console.error('Error fetching public jobs:', err);
                setError('İş ilanları yüklenirken bir sorun oluştu.');
            } finally {
                setLoading(false);
            }
        };

        fetchJobs();
    }, []);

    return (
        <div className="job-list-page">
            <div className="job-list-header">
                <h2>Our Companies Needs You</h2>
            </div>

            <div className="job-list">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '50px', width: '100%', color: '#666' }}>
                        İlanlar yükleniyor...
                    </div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '50px', width: '100%', color: 'red' }}>
                        {error}
                    </div>
                ) : jobs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px', width: '100%', color: '#666' }}>
                        Şu anda aktif bir iş ilanı bulunmamaktadır.
                    </div>
                ) : (
                    jobs.map((job) => (
                        <div key={job.id} className="job-card">
                            <div className="job-card-top">
                                <div className="job-logo">
                                    <img src={jobLogo} alt="Job Offer" className="job-logo-img" />
                                </div>
                                <div className="job-meta">
                                    <span className="job-time-type">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                        {job.workType || 'Full Time'}
                                    </span>
                                    <h3 className="job-title">{job.jobTitle}</h3>
                                </div>
                            </div>

                            <p className="job-description">
                                {/* The backend might not send a full description in the summary view, fallback to department */}
                                {job.department ? `${job.department} Departmanı` : 'Detaylar için ilanı inceleyin.'}
                            </p>

                            <div className="job-card-footer">
                                <div className="job-location">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-map-pin"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 15 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></svg>
                                    {job.location || 'Belirtilmedi'}
                                </div>
                                <button
                                    className="apply-now-btn"
                                    onClick={() => navigate(`/jobs/${job.id}`)}
                                >
                                    Apply Now
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default JobList;
