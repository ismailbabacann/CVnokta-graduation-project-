import React, { useState } from 'react';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import styles from './CreateJob.module.css';

// Set up the worker for pdf.js (Same version as ApplicationForm)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

function CreateJob() {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
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

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || file.type !== 'application/pdf') return;

        try {
            setIsParsing(true);
            setError('');
            
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let text = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const strings = content.items.map(item => item.str);
                text += strings.join(' ') + '\n';
            }
            
            console.log("--- RAW PDF TEXT ---");
            console.log(text);
            console.log("--------------------");

            // Check if it's a valid template
            const lowerText = text.toLowerCase();
            if (!lowerText.includes('ilan') && !lowerText.includes('departman') && !lowerText.includes('about the role') && !lowerText.includes('responsibilities')) {
                alert("Uyarı: Yüklenen PDF dosyasında beklenen standart başlıklar (Örn: 'İlan Başlığı', 'About The Role') bulunamadı. Metinler yanlış yerlere dolabilir.");
            }

            // A more resilient extraction function that looks for keywords with or without colons, 
            // and captures everything up to the next known keyword.
            const extractSection = (startKeywords, endKeywords, fallback = '') => {
                const startRegex = new RegExp(`(?:${startKeywords.join('|')})\\s*:?\\s*`, 'i');
                const startMatch = text.match(startRegex);
                
                if (!startMatch) return fallback;
                
                const startIndex = startMatch.index + startMatch[0].length;
                let endIndex = text.length;

                if (endKeywords && endKeywords.length > 0) {
                    const endRegex = new RegExp(`(?:${endKeywords.join('|')})\\s*:?\\s*`, 'i');
                    // Search for the end keyword ONLY AFTER the start index
                    const remainingText = text.substring(startIndex);
                    const endMatch = remainingText.match(endRegex);
                    if (endMatch) {
                        endIndex = startIndex + endMatch.index;
                    }
                }

                const extracted = text.substring(startIndex, endIndex).trim();
                return extracted || fallback;
            };

            const parsedData = {
                jobTitle: extractSection(['İlan Başlığı', 'Pozisyon', 'Job Title'], ['Departman', 'About the Team', 'About The Role']) || formData.jobTitle,
                department: extractSection(['Departman', 'Bölüm', 'Department'], ['Şirket Hakkında', 'Biz Kimiz', 'About the Team']) || formData.department,
                aboutCompany: extractSection(['Şirket Hakkında', 'Biz Kimiz', 'Hakkımızda', 'About Company', 'About the Team'], ['Rol Hakkında', 'İş Tanımı', 'Sorumluluklar', 'Aranan Nitelikler', 'Görevler', 'About The Role', 'Responsibilities']) || formData.aboutCompany,
                aboutRole: extractSection(['Rol Hakkında', 'İş Tanımı', 'Position Overview', 'About The Role'], ['Sorumluluklar', 'Görevler', 'Aranan Nitelikler', 'İstenen Yetenekler', 'Ayrıcalıklar', 'Responsibilities']) || formData.aboutRole,
                responsibilities: extractSection(['Sorumluluklar', 'Görevler', 'İş Tanımı', 'Responsibilities'], ['Aranan Nitelikler', 'İstenen Yetenekler', 'Beklentilerimiz', 'Ayrıcalıklar', 'Yan Haklar', 'Expected Qualifications', 'What We Offer', 'Take the Next Step']) || formData.responsibilities,
                requiredQualifications: extractSection(['Aranan Nitelikler', 'İstenen Yetenekler', 'Beklentilerimiz', 'Qualifications', 'Requirements', 'Expected Qualifications'], ['Ayrıcalıklar', 'Yan Haklar', 'Sunduklarımız', 'Benefits', 'What We Offer', 'Take the Next Step']) || formData.requiredQualifications,
                benefits: extractSection(['Ayrıcalıklar', 'Yan Haklar', 'Sunduklarımız', 'Faydalar', 'Benefits', 'What We Offer'], ['Take the Next Step']) || formData.benefits
            };

            setFormData(prev => ({ ...prev, ...parsedData }));

        } catch (err) {
            console.error('PDF Parsing Error:', err);
            setError('PDF Okunurken bir hata oluştu. Dosyanın şifreli veya bozuk olmadığından emin olun.');
        } finally {
            setIsParsing(false);
            e.target.value = null; // reset file input
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
                    <h2 className={styles.successTitle}>Job Posting Successfully Created!</h2>
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
                    <h2 className={styles.title}>Create New Job Posting</h2>
                    <p className={styles.subtitle}>Enter the core details of the job to find the right talent for your company.</p>
                </div>
            </div>

            <form className={styles.formContainer} onSubmit={(e) => handleSubmit(e, false)}>
                {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

                {/* PDF Upload Banner */}
                <div style={{ backgroundColor: '#eef2ff', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px dashed #6366f1' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#4f46e5' }}>🤖 Yapay Zeka ile Otomatik Doldur (İsteğe Bağlı)</h3>
                    <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#4b5563' }}>
                        Standart İlan Taslağınızı (PDF) yükleyin, sistem "İlan Başlığı:", "Sorumluluklar:" vb. başlıkları algılayıp formu sizin yerinize doldursun.
                    </p>
                    <input 
                        type="file" 
                        accept="application/pdf" 
                        onChange={handleFileUpload}
                        disabled={isParsing}
                        style={{ display: 'block', padding: '10px', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', width: '100%', maxWidth: '400px' }}
                    />
                    {isParsing && <span style={{display: 'block', marginTop: '10px', color: '#4f46e5', fontWeight: 'bold'}}>PDF Analiz ediliyor...</span>}
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
                        {loading ? 'Publishing...' : 'Publish Job'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default CreateJob;
