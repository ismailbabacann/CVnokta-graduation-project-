import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './MyProfile.module.css';

function MyProfile() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        coverLetter: '',
    });
    
    const [cvInfo, setCvInfo] = useState(null);
    const [cvUrl, setCvUrl] = useState(null);
    const [candidateId, setCandidateId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Load Cloudinary widget script
    useEffect(() => {
        if (!document.getElementById('cloudinary-widget-script')) {
            const script = document.createElement('script');
            script.id = 'cloudinary-widget-script';
            script.src = 'https://widget.cloudinary.com/v2.0/global/all.js';
            script.async = true;
            document.body.appendChild(script);
        }
    }, []);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('jwToken');
                if (!token) { setIsLoading(false); return; }

                const payload = JSON.parse(atob(token.split('.')[1]));
                const uid = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.uid || payload.sub;
                const tokenEmail = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || payload.email || '';
                const tokenName = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || payload.name || localStorage.getItem('userName') || '';

                if (uid) {
                    setCandidateId(uid);
                    let p = null;
                    try {
                        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/v1/Candidates/${uid}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        p = response.data.data || response.data;
                    } catch (fetchErr) {
                        console.warn('Profile does not exist yet or error:', fetchErr);
                    }
                    
                    const actualName = (p && p.fullName) ? p.fullName : tokenName;
                    const nameParts = actualName.split(' ');
                    const fName = nameParts.slice(0, -1).join(' ') || actualName;
                    const lName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

                    setFormData({
                        firstName: fName || '',
                        lastName: lName || '',
                        email: (p && p.email) ? p.email : tokenEmail,
                        phone: p?.phone || '',
                        location: p?.location || '',
                        linkedin: p?.linkedInProfile || '',
                        coverLetter: p?.summary || ''
                    });
                    
                    if (p && p.cvUrl) {
                        setCvInfo(p.cvUrl.split('/').pop() || 'Current CV');
                        setCvUrl(p.cvUrl);
                    }
                }
            } catch (err) {
                console.error('Profile loading error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, []);


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!candidateId) { alert("Please log in."); return; }
        
        setIsSaving(true);
        try {
            const token = localStorage.getItem('jwToken');
            const updatePayload = {
                fullName: `${formData.firstName} ${formData.lastName}`.trim(),
                email: formData.email,
                phone: formData.phone,
                location: formData.location,
                linkedInProfile: formData.linkedin,
                summary: formData.coverLetter
            };

            await axios.put(`${process.env.REACT_APP_API_BASE_URL}/api/v1/Candidates/${candidateId}`, updatePayload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Profile information updated successfully!');
        } catch (err) {
            console.error('Update error:', err);
            alert('An error occurred during the update.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCvUpload = () => {
        if (!candidateId) { alert('Please log in.'); return; }

        // Cloudinary Upload Widget
        if (!window.cloudinary) {
            alert('Cloudinary failed to load. Please refresh the page and try again.');
            return;
        }

        const widget = window.cloudinary.createUploadWidget(
            {
                cloudName: 'dizjdaqgr',        // Your Cloudinary cloud name
                uploadPreset: 'cv_uploads', // Your Cloudinary unsigned preset name
                sources: ['local', 'url'],
                resourceType: 'raw',            // raw for PDF files
                clientAllowedFormats: ['pdf', 'doc', 'docx'],
                maxFileSize: 5000000,           // 5MB
                multiple: false,
                language: 'en',
                text: { en: { or: 'or', menu: { files: 'Choose File', url: 'Enter URL' } } }
            },
            async (error, result) => {
                if (error) {
                    console.error('Cloudinary widget error:', error);
                    alert('An error occurred while uploading the CV.');
                    return;
                }
                if (result && result.event === 'success') {
                    const cloudinaryUrl = result.info.secure_url;
                    const fileName = result.info.original_filename + '.' + result.info.format;

                    try {
                        const token = localStorage.getItem('jwToken');
                        await axios.post(process.env.REACT_APP_API_BASE_URL + '/api/v1/Candidates/upload-cv', {
                            candidateId: candidateId,
                            fileName: fileName,
                            cloudinaryUrl: cloudinaryUrl,
                            contentType: 'application/pdf'
                        }, {
                            headers: { Authorization: `Bearer ${token}` }
                        });

                        alert('CV uploaded successfully!');
                        setCvInfo(fileName);
                        setCvUrl(cloudinaryUrl);
                    } catch (err) {
                        console.error('CV save error:', err);
                        alert('CV uploaded to Cloudinary but could not be saved to the system.');
                    }
                }
            }
        );
        widget.open();
    };


    if (isLoading) return <div style={{padding:'2rem'}}>Loading Profile...</div>;

    return (
        <div className={styles.profileContainer}>
            <div className={styles.header}>
                <h2>Personal Information & CV</h2>
                <p>You can update your basic information and CV to be used in job applications here.</p>
            </div>

            <form className={styles.formContainer} onSubmit={handleSubmit}>
                <div className={styles.formSection}>
                    <h3 className={styles.sectionTitle}>Contact Information</h3>
                    <div className={styles.inputGrid}>
                        <div className={styles.inputGroup}>
                            <label>First Name</label>
                            <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Last Name</label>
                            <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Email</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Phone</label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Location</label>
                            <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="Ex: Istanbul" />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>LinkedIn Profile URL</label>
                            <input type="url" name="linkedin" value={formData.linkedin} onChange={handleChange} placeholder="https://linkedin.com/in/..." />
                        </div>
                    </div>
                </div>

                <div className={styles.formSection}>
                    <h3 className={styles.sectionTitle}>Documents & Cover Letter</h3>
                    
                    <div className={styles.inputGroup}>
                        <label>Cover Letter</label>
                        <textarea 
                            name="coverLetter" 
                            value={formData.coverLetter} 
                            onChange={handleChange}
                            rows="5"
                            placeholder="Briefly introduce yourself..."
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Resume (CV)</label>
                        <div className={styles.fileUploadBox}>
                            <div className={styles.fileIcon}>📄</div>
                            <div className={styles.fileDetails}>
                                {cvInfo ? (
                                    <>
                                        <span className={styles.fileName}>Currently Uploaded CV: <strong>{cvInfo}</strong></span>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <a href={cvUrl} target="_blank" rel="noopener noreferrer" className={styles.viewBtn}>View CV</a>
                                            <button type="button" className={styles.uploadBtn} onClick={handleCvUpload}>
                                                Update CV
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <span className={styles.fileName}>No CV found in your system. Please upload a CV before applying for jobs.</span>
                                        <button type="button" className={styles.uploadBtn} onClick={handleCvUpload}>
                                            Upload CV
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.formActions}>
                    <button type="submit" className={styles.saveBtn} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default MyProfile;
