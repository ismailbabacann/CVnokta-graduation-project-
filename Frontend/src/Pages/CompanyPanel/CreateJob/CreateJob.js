import React, { useState } from 'react';
import axios from 'axios';
import styles from './CreateJob.module.css';

function CreateJob() {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [createdJobId, setCreatedJobId] = useState('');

    const [formData, setFormData] = useState({
        jobTitle: '',
        department: '',
        location: '',
        workType: 'FullTime',
        workModel: 'Hybrid',
        aboutCompany: '',
        aboutRole: '',
        responsibilities: '',
        requiredQualifications: '',
        benefits: '', // we will split this by commas before sending
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e, saveAsDraft = false) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const token = localStorage.getItem('jwToken');
            if (!token) {
                setError('You must be logged in to create a job posting.');
                setLoading(false);
                return;
            }

            // Split benefits into an array
            const benefitsArray = formData.benefits
                ? formData.benefits.split(/\r?\n|,/).map(b => b.trim()).filter(b => b)
                : [];

            const payload = {
                jobTitle: formData.jobTitle,
                department: formData.department,
                location: formData.location,
                workType: formData.workType,
                workModel: formData.workModel,
                aboutCompany: formData.aboutCompany,
                aboutRole: formData.aboutRole,
                responsibilities: formData.responsibilities,
                requiredQualifications: formData.requiredQualifications,
                benefits: benefitsArray,
                aiScanEnabled: false, // Defaulting to false for now
                minMatchScore: 70, // Defaulting to 70 for now
                autoEmailEnabled: false, // Defaulting to false for now
                saveAsDraft: saveAsDraft
            };

            const response = await axios.post('https://localhost:9001/api/v1/JobPostings', payload, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            console.log('Create job response:', response.data);

            if (response.data && response.data.data && response.data.data.id) {
                setCreatedJobId(response.data.data.id);
            } else if (response.data && response.data.id) {
                setCreatedJobId(response.data.id);
            }

            setIsSubmitted(true);
            window.scrollTo(0, 0);

        } catch (err) {
            console.error('Create job error:', err);
            if (err.response && err.response.data && err.response.data.Message) {
                setError(err.response.data.Message);
            } else if (err.response && err.response.status === 401) {
                setError("You are unauthorized. Please try logging in again.");
            } else if (err.response && err.response.status === 403) {
                setError("You do not have permission to create job postings. Hiring Manager role required.");
            } else {
                setError('An error occurred while creating the job posting.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        const link = `hr.ai/jobs/ilan-${createdJobId || 'placeholder'}`;
        navigator.clipboard.writeText(link);
        alert("Link copied!");
    };

    const resetForm = () => {
        setIsSubmitted(false);
        setCreatedJobId('');
        setFormData({
            jobTitle: '',
            department: '',
            location: '',
            workType: 'FullTime',
            workModel: 'Hybrid',
            aboutCompany: '',
            aboutRole: '',
            responsibilities: '',
            requiredQualifications: '',
            benefits: '',
        });
    };

    if (isSubmitted) {
        return (
            <div className={styles.container}>
                <div className={styles.successCard}>
                    <div className={styles.successIcon}>✓</div>
                    <h2 className={styles.successTitle}>Job Posting Successfully Created!</h2>
                    <p className={styles.successText}>
                        You can now share this posting with candidates and start collecting applications.
                    </p>

                    <div className={styles.linkContainer}>
                        <span className={styles.linkText}>hr.ai/jobs/ilan-{createdJobId || 'pending'}</span>
                        <button className={styles.copyBtn} onClick={handleCopy}>Copy</button>
                    </div>

                    <div className={styles.actionButtons}>
                        <button
                            className={styles.newJobBtn}
                            onClick={resetForm}
                        >
                            Create New Posting
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2 className={styles.title}>Create New Job Posting</h2>
                    <p className={styles.subtitle}>Enter the core details of the job to find the right talent for your company.</p>
                </div>
            </div>

            <form className={styles.formContainer} onSubmit={(e) => handleSubmit(e, false)}>
                {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

                {/* Box 1: Basic Info */}
                <div className={styles.box}>
                    <div className={styles.boxHeader}>
                        <span className={styles.icon}>ℹ️</span>
                        <h3>Basic Information</h3>
                    </div>
                    <div className={styles.formGroup}>
                        <label>Job Title</label>
                        <input name="jobTitle" value={formData.jobTitle} onChange={handleChange} required type="text" placeholder="Ex: Senior Software Engineer" className={styles.input} />
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label>Department</label>
                            <input name="department" value={formData.department} onChange={handleChange} required type="text" placeholder="Ex: Engineering" className={styles.input} />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Location</label>
                            <input name="location" value={formData.location} onChange={handleChange} required type="text" placeholder="Ex: Istanbul / Maslak" className={styles.input} />
                        </div>
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label>Work Type</label>
                            <select name="workType" value={formData.workType} onChange={handleChange} className={styles.select}>
                                <option value="FullTime">Full Time</option>
                                <option value="PartTime">Part Time</option>
                                <option value="Contract">Contract</option>
                                <option value="Internship">Internship</option>
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Work Model</label>
                            <select name="workModel" value={formData.workModel} onChange={handleChange} className={styles.select}>
                                <option value="Remote">Remote</option>
                                <option value="Hybrid">Hybrid</option>
                                <option value="OnSite">On-Site</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Box 2: Content Details */}
                <div className={styles.box}>
                    <div className={styles.boxHeader}>
                        <span className={styles.icon}>📄</span>
                        <h3>Content Details</h3>
                    </div>

                    <div className={styles.formGroup}>
                        <label>About Company</label>
                        <textarea name="aboutCompany" value={formData.aboutCompany} onChange={handleChange} required placeholder="Talk about your company's vision, culture, and purpose..." className={styles.textarea}></textarea>
                    </div>

                    <div className={styles.formGroup}>
                        <label>About Role</label>
                        <textarea name="aboutRole" value={formData.aboutRole} onChange={handleChange} required placeholder="What will be the candidate's position within the company? What is their main objective?" className={styles.textarea}></textarea>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Responsibilities</label>
                        <textarea name="responsibilities" value={formData.responsibilities} onChange={handleChange} required placeholder="• Write down daily job responsibilities..." className={styles.richTextarea}></textarea>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Required Qualifications</label>
                        <textarea name="requiredQualifications" value={formData.requiredQualifications} onChange={handleChange} required placeholder="• Educational background, years of experience, technical skills..." className={styles.richTextarea}></textarea>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Benefits & Perks (Separate by comma or new line)</label>
                        <textarea name="benefits" value={formData.benefits} onChange={handleChange} placeholder="Private health insurance, flexible working hours, meal card..." className={styles.richTextarea}></textarea>
                    </div>
                </div>

                <div className={styles.submitRow}>
                    <button type="button" onClick={(e) => handleSubmit(e, true)} className={styles.saveDraftBtn} disabled={loading}>
                        {loading ? 'Saving...' : 'Save as Draft'}
                    </button>
                    <button type="submit" className={styles.publishBtn} disabled={loading}>
                        {loading ? 'Publishing...' : 'Publish Job'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default CreateJob;
