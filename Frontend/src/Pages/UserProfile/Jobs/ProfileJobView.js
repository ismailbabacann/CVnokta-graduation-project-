import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './ProfileJobView.module.css';

function ProfileJobView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isApplying, setIsApplying] = useState(false);
    const [candidateProfile, setCandidateProfile] = useState(null);
    const [hasCv, setHasCv] = useState(false);

    useEffect(() => {
        const fetchJobDetails = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/v1/JobPostings/public/${id}`);
                setJob(response.data.data || response.data);
                setError(null);
            } catch (err) {
                console.error('Error fetching job details:', err);
                setError('Job posting not found or an error occurred.');
            }
        };

        const fetchCandidateProfile = async () => {
            try {
                const token = localStorage.getItem('jwToken');
                if (!token) return;

                const payload = JSON.parse(atob(token.split('.')[1]));
                const uid = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.uid || payload.sub;
                
                if (uid) {
                    const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/v1/Candidates/${uid}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const p = response.data.data || response.data;
                    setCandidateProfile(p);
                    setHasCv(!!p.cvUrl);
                }
            } catch (err) {
                console.error('Could not fetch candidate profile:', err);
            }
        };

        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchJobDetails(), fetchCandidateProfile()]);
            setLoading(false);
        };

        loadData();
    }, [id]);

    const handleFastApply = async () => {
        setIsApplying(true);
        try {
            const token = localStorage.getItem('jwToken');
            let candidateId = null;
            let email = '';
            let fullName = localStorage.getItem('userName') || 'Candidate';

            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                candidateId = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.uid || payload.sub;
                email = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || payload.email || 'ornek@email.com';
            }

            const payloadData = {
                jobPostingId: id,
                candidateId: candidateId,
                fullName: candidateProfile?.fullName || fullName,
                email: candidateProfile?.email || email || '',
                phone: candidateProfile?.phone || "",
                location: candidateProfile?.location || "",
                linkedInProfile: candidateProfile?.linkedInProfile || "",
                coverLetter: candidateProfile?.summary || "Applying quickly with my profile information.",
                cvUrl: candidateProfile?.cvUrl || "",
                cvId: candidateProfile?.cvId || null
            };

            await axios.post(process.env.REACT_APP_API_BASE_URL + '/api/v1/Applications/public/apply', payloadData);
            
            alert('Congratulations! Your application has been successfully submitted using your profile CV and information. You can track your progress from the "My Applications" section.');
            navigate('/profile/applications');
        } catch (err) {
            console.error('Application error:', err);
            alert('An error occurred during the application or you have already applied.');
        } finally {
            setIsApplying(false);
        }
    };

    if (loading) {
        return <div className={styles.centeredMessage}>Loading Details...</div>;
    }

    if (error || !job) {
        return <div className={`${styles.centeredMessage} ${styles.errorMessage}`}>{error || 'Posting not found.'}</div>;
    }

    return (
        <div className={styles.jobviewContainer}>
            <button className={styles.backBtn} onClick={() => navigate('/profile/jobs')}>
                ← Back to Jobs
            </button>

            <section className={styles.jobHeader}>
                <h1>{job.jobTitle}</h1>
                <p className={styles.jobDepartment}>{job.companyName || 'Company Confidential'} - {job.department}</p>
                <div className={styles.jobMeta}>
                    <span>📍 {job.location || 'Not specified'}</span>
                    <span>💼 {job.workType || 'Full Time'}</span>
                    <span>🌍 {job.workModel || 'Hybrid'}</span>
                </div>
            </section>

            <section className={styles.jobSection}>
                <h2>About the Role</h2>
                <p>{job.description || job.aboutRole || 'A detailed posting description has not been entered yet.'}</p>
            </section>

            {job.aboutCompany && (
                <section className={styles.jobSection}>
                    <h2>About the Company</h2>
                    <p>{job.aboutCompany}</p>
                </section>
            )}

            {job.responsibilities && (
                <section className={styles.jobSection}>
                    <h2>Responsibilities</h2>
                    <p>{job.responsibilities}</p>
                </section>
            )}

            {job.requiredQualifications && (
                <section className={styles.jobSection}>
                    <h2>Required Qualifications</h2>
                    <p>{job.requiredQualifications}</p>
                </section>
            )}

            {job.benefits && job.benefits.length > 0 && (
                <section className={styles.jobSection}>
                    <h2>Benefits & Perks</h2>
                    <div className={styles.benefitsGrid}>
                        {job.benefits.map((benefit, idx) => (
                            <div key={idx} className={styles.benefitCard}>
                                <h3>🌟 {benefit}</h3>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <div className={styles.applyActionBox}>
                <div className={styles.profileNotice}>
                    <span className={styles.infoIcon}>ℹ️</span>
                    <p>Your cover letter, education details, and current CV on file will be directly submitted to the company for this job. You can complete the quick application below.</p>
                </div>
                {job.status === 'Active' ? (
                    hasCv ? (
                        <button 
                            className={styles.fastApplyBtn} 
                            onClick={handleFastApply}
                            disabled={isApplying}
                        >
                            {isApplying ? 'Submitting Application...' : 'Apply with My Profile'}
                        </button>
                    ) : (
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ color: '#e53e3e', fontSize: '14px', marginBottom: '10px' }}>
                                ⚠️ You must upload your CV from the Profile section to apply for jobs.
                            </p>
                            <button 
                                className={styles.fastApplyBtn} 
                                style={{backgroundColor: '#cbd5e1', cursor: 'not-allowed', color: '#475569'}}
                                disabled
                            >
                                Apply with My Profile
                            </button>
                        </div>
                    )
                ) : (
                    <button 
                        className={styles.fastApplyBtn} 
                        style={{backgroundColor: '#cbd5e1', cursor: 'not-allowed', color: '#475569'}}
                        disabled
                    >
                        Closed
                    </button>
                )}
            </div>
        </div>
    );
}

export default ProfileJobView;
