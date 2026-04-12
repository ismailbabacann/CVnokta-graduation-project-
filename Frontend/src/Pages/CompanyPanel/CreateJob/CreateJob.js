import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './CreateJob.module.css';

function CreateJob() {
    const location = useLocation();
    const navigate = useNavigate();

    const [isSubmitted, setIsSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [createdJobId, setCreatedJobId] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [editJobId, setEditJobId] = useState('');
    
    // AI State
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

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

    useEffect(() => {
        if (location.state) {
            const jobData = location.state.jobToEdit || location.state.jobToCopy;
            if (jobData) {
                const jobId = jobData.jobId || jobData.id;
                if (location.state.jobToEdit) {
                    setIsEditMode(true);
                    setEditJobId(jobId);
                }
                
                // Fetch full details from backend
                setLoading(true);
                axios.get(`https://localhost:9001/api/v1/JobPostings/public/${jobId}`)
                    .then(response => {
                        const fullJob = response.data;
                        setFormData({
                            jobTitle: fullJob.jobTitle || jobData.jobTitle || '',
                            department: fullJob.department || jobData.department || '',
                            location: fullJob.location || jobData.location || '',
                            workType: fullJob.workType || jobData.workType || 'FullTime',
                            workModel: fullJob.workModel || jobData.workModel || 'Hybrid',
                            aboutCompany: fullJob.aboutCompany || '',
                            aboutRole: fullJob.aboutRole || '',
                            responsibilities: fullJob.responsibilities || '',
                            requiredQualifications: fullJob.requiredQualifications || '',
                            benefits: Array.isArray(fullJob.benefits) ? fullJob.benefits.join(', ') : (fullJob.benefits || '')
                        });
                    })
                    .catch(err => {
                        console.error("Failed to fetch full job details", err);
                        // Fallback to basic data 
                        setFormData({
                            jobTitle: jobData.jobTitle || '',
                            department: jobData.department || '',
                            location: jobData.location || '',
                            workType: jobData.workType || 'FullTime',
                            workModel: jobData.workModel || 'Hybrid',
                            aboutCompany: jobData.aboutCompany || '',
                            aboutRole: jobData.aboutRole || '',
                            responsibilities: jobData.responsibilities || '',
                            requiredQualifications: jobData.requiredQualifications || '',
                            benefits: Array.isArray(jobData.benefits) ? jobData.benefits.join(', ') : (jobData.benefits || '')
                        });
                    })
                    .finally(() => setLoading(false));
            }
        }
    }, [location.state]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleGenerateFromAI = async () => {
        if (!aiPrompt.trim()) {
            alert('Lütfen iş tanımı ile ilgili bir metin girin.');
            return;
        }

        try {
            setIsGenerating(true);
            setError('');
            const token = localStorage.getItem('jwToken');
            
            const response = await axios.post('https://localhost:9001/api/v1/JobPostings/generate-details', {
                applicationContext: aiPrompt
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.data) {
                const aiData = response.data;
                setFormData(prev => ({
                    ...prev,
                    jobTitle: aiData.jobTitle || prev.jobTitle,
                    department: aiData.department || prev.department,
                    location: aiData.location || prev.location,
                    workType: aiData.workType || prev.workType,
                    workModel: aiData.workModel || prev.workModel,
                    aboutCompany: aiData.aboutCompany || prev.aboutCompany,
                    aboutRole: aiData.aboutRole || prev.aboutRole,
                    responsibilities: aiData.responsibilities || prev.responsibilities,
                    requiredQualifications: aiData.requiredQualifications || prev.requiredQualifications,
                    benefits: Array.isArray(aiData.benefits) ? aiData.benefits.join(', ') : (aiData.benefits || prev.benefits)
                }));
            }
        } catch (err) {
            console.error('AI Generation Error:', err);
            alert('AI ile içerik oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setIsGenerating(false);
        }
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

            let response;
            if (isEditMode) {
                payload.id = editJobId;
                response = await axios.put(`https://localhost:9001/api/v1/JobPostings/${editJobId}`, payload, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
            } else {
                response = await axios.post('https://localhost:9001/api/v1/JobPostings', payload, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
            }

            console.log('Job response:', response.data);

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
        const link = `${window.location.origin}/jobs/${createdJobId || 'placeholder'}`;
        navigator.clipboard.writeText(link);
        alert("Link kopyalandı!");
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
                    <h2 className={styles.successTitle}>{isEditMode ? 'Job Posting Successfully Updated!' : 'Job Posting Successfully Created!'}</h2>
                    <p className={styles.successText}>
                        You can now share this posting with candidates and start collecting applications.
                    </p>

                    <div className={styles.linkContainer}>
                        <span className={styles.linkText}>{window.location.origin}/jobs/{createdJobId || 'pending'}</span>
                        <button className={styles.copyBtn} onClick={handleCopy}>Kopyala</button>
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
                    <h2 className={styles.title}>{isEditMode ? 'Edit Job Posting' : 'Create New Job Posting'}</h2>
                    <p className={styles.subtitle}>Enter the core details of the job to find the right talent for your company.</p>
                </div>
                <button type="button" onClick={() => navigate('/company/jobs')} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>Geri Dön</button>
            </div>

            <form className={styles.formContainer} onSubmit={(e) => handleSubmit(e, false)}>
                {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

                {/* AI Prompt Section */}
                <div style={{ backgroundColor: '#eef2ff', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px dashed #6366f1' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#4f46e5' }}>🤖 Yapay Zeka ile İş İlanı Detayı Oluştur (İsteğe Bağlı)</h3>
                    <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#4b5563' }}>
                        Aradığınız adayın ve işin özelliklerini kısaca yazın (Örn: Fintech şirketi için 3 yıl deneyimli .NET backend developer arıyoruz). Yapay Zeka, tüm formu detaylı şekilde doldursun.
                    </p>
                    <textarea 
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="İlan hakkında yönergelerinizi yazın..."
                        style={{ width: '100%', minHeight: '80px', padding: '10px', borderRadius: '6px', border: '1px solid #c7d2fe', marginBottom: '10px', fontFamily: 'Inter, sans-serif' }}
                    />
                    <button 
                        type="button" 
                        onClick={handleGenerateFromAI} 
                        disabled={isGenerating}
                        style={{ padding: '10px 20px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        {isGenerating ? 'Yapay Zeka Çalışıyor...' : '✨ Otomatik Doldur'}
                    </button>
                    {isGenerating && <span style={{display: 'inline-block', marginLeft: '10px', color: '#4f46e5', fontWeight: '500'}}>Form alanları dolduruluyor...</span>}
                </div>

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
                        {loading ? 'Publishing...' : (isEditMode ? 'Update Job' : 'Publish Job')}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default CreateJob;
