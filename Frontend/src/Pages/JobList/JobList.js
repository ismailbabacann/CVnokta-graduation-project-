import React from 'react';
import { useNavigate } from 'react-router-dom';
import './JobList.css';
import jobLogo from '../../assets/job_logo.png';

function JobList({ jobs }) {
    const navigate = useNavigate();

    return (
        <div className="job-list-page">
            <div className="job-list-header">
                <h2>Our Companies Needs You</h2>
            </div>

            <div className="job-list">
                {jobs.map((job) => (
                    <div key={job.id} className="job-card">
                        <div className="job-card-top">
                            <div className="job-logo">
                                <img src={jobLogo} alt="Job Offer" className="job-logo-img" />
                            </div>
                            <div className="job-meta">
                                <span className="job-time-type">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                    {job.type}
                                </span>
                                <h3 className="job-title">{job.position}</h3>
                            </div>
                        </div>

                        <p className="job-description">{job.description}</p>

                        <div className="job-card-footer">
                            <div className="job-location">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-map-pin"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 15 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></svg>
                                {job.location}
                            </div>
                            <button
                                className="apply-now-btn"
                                onClick={() => navigate(`/jobs/${job.id}`)}
                            >
                                Apply Now
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default JobList;
