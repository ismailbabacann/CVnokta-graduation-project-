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
    const [candidateId, setCandidateId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Cloudinary widget script'ini yükle
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
                        const response = await axios.get(`https://localhost:9001/api/v1/Candidates/${uid}`, {
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
                        setCvInfo(p.cvUrl.split('/').pop() || 'Mevcut CV');
                    }
                }
            } catch (err) {
                console.error('Profil yükleme hatası:', err);
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
        if (!candidateId) { alert("Lütfen giriş yapın."); return; }
        
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

            await axios.put(`https://localhost:9001/api/v1/Candidates/${candidateId}`, updatePayload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Profil bilgileriniz başarıyla güncellendi!');
        } catch (err) {
            console.error('Güncelleme hatası:', err);
            alert('Güncelleme sırasında bir hata oluştu.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCvUpload = () => {
        if (!candidateId) { alert('Lütfen giriş yapın.'); return; }

        // Cloudinary Upload Widget
        if (!window.cloudinary) {
            alert('Cloudinary yüklenemedi. Sayfayı yenileyip tekrar deneyin.');
            return;
        }

        const widget = window.cloudinary.createUploadWidget(
            {
                cloudName: 'dizjdaqgr',        // Cloudinary cloud adın
                uploadPreset: 'ml_default',    // Cloudinary unsigned preset adın
                sources: ['local', 'url'],
                resourceType: 'raw',            // PDF dosyası için raw
                clientAllowedFormats: ['pdf', 'doc', 'docx'],
                maxFileSize: 5000000,           // 5MB
                multiple: false,
                language: 'tr',
                text: { tr: { or: 'veya', menu: { files: 'Dosya Seç', url: 'URL Gir' } } }
            },
            async (error, result) => {
                if (error) {
                    console.error('Cloudinary widget hatası:', error);
                    alert('CV yüklenirken bir hata oluştu.');
                    return;
                }
                if (result && result.event === 'success') {
                    const cloudinaryUrl = result.info.secure_url;
                    const fileName = result.info.original_filename + '.' + result.info.format;

                    try {
                        const token = localStorage.getItem('jwToken');
                        await axios.post('https://localhost:9001/api/v1/Candidates/upload-cv', {
                            candidateId: candidateId,
                            fileName: fileName,
                            cloudinaryUrl: cloudinaryUrl,
                            contentType: 'application/pdf'
                        }, {
                            headers: { Authorization: `Bearer ${token}` }
                        });

                        alert('CV başarıyla yüklendi!');
                        setCvInfo(fileName);
                    } catch (err) {
                        console.error('CV kaydetme hatası:', err);
                        alert('CV Cloudinary\'e yüklendi fakat sisteme kaydedilemedi.');
                    }
                }
            }
        );
        widget.open();
    };


    if (isLoading) return <div style={{padding:'2rem'}}>Profil Yükleniyor...</div>;

    return (
        <div className={styles.profileContainer}>
            <div className={styles.header}>
                <h2>Kişisel Bilgiler & Özgeçmiş</h2>
                <p>İş başvurularınızda kullanılacak temel bilgilerinizi ve özgeçmişinizi buradan güncelleyebilirsiniz.</p>
            </div>

            <form className={styles.formContainer} onSubmit={handleSubmit}>
                <div className={styles.formSection}>
                    <h3 className={styles.sectionTitle}>İletişim Bilgileri</h3>
                    <div className={styles.inputGrid}>
                        <div className={styles.inputGroup}>
                            <label>Ad</label>
                            <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Soyad</label>
                            <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>E-posta</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Telefon</label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Lokasyon</label>
                            <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="Örn: İstanbul" />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>LinkedIn Profil URL</label>
                            <input type="url" name="linkedin" value={formData.linkedin} onChange={handleChange} placeholder="https://linkedin.com/in/..." />
                        </div>
                    </div>
                </div>

                <div className={styles.formSection}>
                    <h3 className={styles.sectionTitle}>Dokümanlar & Önyazı</h3>
                    
                    <div className={styles.inputGroup}>
                        <label>Önyazı</label>
                        <textarea 
                            name="coverLetter" 
                            value={formData.coverLetter} 
                            onChange={handleChange}
                            rows="5"
                            placeholder="Kendinizi kısaca tanıtın..."
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Özgeçmiş (CV)</label>
                        <div className={styles.fileUploadBox}>
                            <div className={styles.fileIcon}>📄</div>
                            <div className={styles.fileDetails}>
                                {cvInfo ? (
                                    <span className={styles.fileName}>Mevcut Yüklü CV: <strong>{cvInfo}</strong></span>
                                ) : (
                                    <span className={styles.fileName}>Sisteminizde yüklenmiş bir CV bulunamadı. Lütfen ilanlara başvurmadan önce CV yükleyiniz.</span>
                                )}
                                <button type="button" className={styles.uploadBtn} onClick={handleCvUpload}>
                                    {cvInfo ? 'Yeni CV Yükle' : 'CV Yükle'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.formActions}>
                    <button type="submit" className={styles.saveBtn} disabled={isSaving}>
                        {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default MyProfile;
