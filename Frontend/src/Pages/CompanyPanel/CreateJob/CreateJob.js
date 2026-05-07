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
        languageLevel: 'B2',
        aboutCompany: '',
        aboutRole: '',
        responsibilities: '',
        requiredQualifications: '',
        requiredSkills: '',
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
                axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/v1/JobPostings/public/${jobId}`)
                    .then(response => {
                        const fullJob = response.data;
                        setFormData({
                            jobTitle: fullJob.jobTitle || jobData.jobTitle || '',
                            department: fullJob.department || jobData.department || '',
                            location: fullJob.location || jobData.location || '',
                            workType: fullJob.workType || jobData.workType || 'FullTime',
                            workModel: fullJob.workModel || jobData.workModel || 'Hybrid',
                            languageLevel: fullJob.languageLevel || jobData.languageLevel || 'B2',
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
                            languageLevel: jobData.languageLevel || 'B2',
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
            alert('Lütfen işle ilgili bir açıklama girin.');
            return;
        }

        try {
            setIsGenerating(true);
            setError('');
            const token = localStorage.getItem('jwToken');
            
            const response = await axios.post(process.env.REACT_APP_API_BASE_URL + '/api/v1/JobPostings/generate-details', {
                applicationContext: aiPrompt
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.data) {
                const cleanHtml = (text) => {
                    if (!text) return '';
                    return text.replace(/<li>/gi, '• ')
                               .replace(/<\/li>/gi, '\n')
                               .replace(/<\/?(ul|ol|p|strong|b|em|i)[^>]*>/gi, '')
                               .replace(/\n\s*\n/g, '\n\n')
                               .trim();
                };

                const aiData = response.data;
                setFormData(prev => ({
                    ...prev,
                    jobTitle: aiData.jobTitle || prev.jobTitle,
                    department: aiData.department || prev.department,
                    location: aiData.location || prev.location,
                    workType: aiData.workType || prev.workType,
                    workModel: aiData.workModel || prev.workModel,
                    aboutCompany: cleanHtml(aiData.aboutCompany) || prev.aboutCompany,
                    aboutRole: cleanHtml(aiData.aboutRole) || prev.aboutRole,
                    responsibilities: cleanHtml(aiData.responsibilities) || prev.responsibilities,
                    requiredQualifications: cleanHtml(aiData.requiredQualifications) || prev.requiredQualifications,
                    benefits: Array.isArray(aiData.benefits) ? aiData.benefits.join(', ') : cleanHtml(aiData.benefits) || prev.benefits
                }));
            }
        } catch (err) {
            console.error('AI Generation Error:', err);
            alert('Yapay zeka ile içerik oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
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
                setError('İş ilanı oluşturmak için giriş yapmış olmalısınız.');
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
                languageLevel: formData.languageLevel,
                aboutCompany: formData.aboutCompany,
                aboutRole: formData.aboutRole,
                responsibilities: formData.responsibilities,
                requiredQualifications: formData.requiredQualifications,
                requiredSkills: formData.requiredSkills,
                benefits: benefitsArray,
                aiScanEnabled: true,  // ✅ AI CV scanning enabled
                minMatchScore: 70,
                autoEmailEnabled: true,
                saveAsDraft: saveAsDraft
            };

            let response;
            if (isEditMode) {
                payload.id = editJobId;
                response = await axios.put(`${process.env.REACT_APP_API_BASE_URL}/api/v1/JobPostings/${editJobId}`, payload, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
            } else {
                response = await axios.post(process.env.REACT_APP_API_BASE_URL + '/api/v1/JobPostings', payload, {
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
                setError("Yetkisiz işlem. Lütfen tekrar giriş yapmayı deneyin.");
            } else if (err.response && err.response.status === 403) {
                setError("İş ilanı oluşturma izniniz yok. İşe Alım Yöneticisi rolü gereklidir.");
            } else {
                setError('İş ilanı oluşturulurken bir hata meydana geldi.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        const link = `${window.location.origin}/jobs/${createdJobId || 'placeholder'}`;
        navigator.clipboard.writeText(link);
        alert("Bağlantı kopyalandı!");
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
            languageLevel: 'B2',
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
                    <h2 className={styles.successTitle}>{isEditMode ? 'İş İlanı Başarıyla Güncellendi!' : 'İş İlanı Başarıyla Oluşturuldu!'}</h2>
                    <p className={styles.successText}>
                        Artık bu ilanı adaylarla paylaşabilir ve başvuruları toplamaya başlayabilirsiniz.
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
                            Yeni İlan Oluştur
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
                    <h2 className={styles.title}>{isEditMode ? 'İş İlanını Düzenle' : 'Yeni İş İlanı Oluştur'}</h2>
                    <p className={styles.subtitle}>Şirketiniz için doğru yeteneği bulmak adına işin temel detaylarını girin.</p>
                </div>
                <button type="button" onClick={() => navigate('/company/jobs')} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>Geri Dön</button>
            </div>

            <form className={styles.formContainer} onSubmit={(e) => handleSubmit(e, false)}>
                {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

                {/* AI Prompt Section */}
                <div style={{ backgroundColor: '#eef2ff', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px dashed #6366f1' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#4f46e5' }}>🤖 Yapay Zeka ile İş İlanı Detayları Oluştur (İsteğe Bağlı)</h3>
                    <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#4b5563' }}>
                        Adayı ve iş gereksinimlerini kısaca açıklayın (Örn: Finansal teknoloji şirketi için 3 yıl deneyimli .NET backend geliştiricisi arıyoruz). Yapay Zeka formun tamamını detaylı bir şekilde dolduracaktır.
                    </p>
                    <textarea 
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="İlanla ilgili talimatlarınızı yazın..."
                        style={{ width: '100%', minHeight: '80px', padding: '10px', borderRadius: '6px', border: '1px solid #c7d2fe', marginBottom: '10px', fontFamily: 'Inter, sans-serif' }}
                    />
                    <button 
                        type="button" 
                        onClick={handleGenerateFromAI} 
                        disabled={isGenerating}
                        style={{ padding: '10px 20px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        {isGenerating ? 'AI Çalışıyor...' : '✨ Otomatik Doldur'}
                    </button>
                    {isGenerating && <span style={{display: 'inline-block', marginLeft: '10px', color: '#4f46e5', fontWeight: '500'}}>Form alanları dolduruluyor...</span>}
                </div>

                {/* Box 1: Basic Info */}
                <div className={styles.box}>
                    <div className={styles.boxHeader}>
                        <span className={styles.icon}>ℹ️</span>
                        <h3>Temel Bilgiler</h3>
                    </div>
                    <div className={styles.formGroup}>
                        <label>İş Başlığı</label>
                        <input name="jobTitle" value={formData.jobTitle} onChange={handleChange} required type="text" placeholder="Örn: Kıdemli Yazılım Mühendisi" className={styles.input} />
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label>Departman</label>
                            <input name="department" value={formData.department} onChange={handleChange} required type="text" placeholder="Örn: Mühendislik" className={styles.input} />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Konum</label>
                            <input name="location" value={formData.location} onChange={handleChange} required type="text" placeholder="Örn: İstanbul / Maslak" className={styles.input} />
                        </div>
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label>Çalışma Türü</label>
                            <select name="workType" value={formData.workType} onChange={handleChange} className={styles.select}>
                                <option value="FullTime">Tam Zamanlı</option>
                                <option value="PartTime">Yarı Zamanlı</option>
                                <option value="Contract">Sözleşmeli</option>
                                <option value="Internship">Staj</option>
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Çalışma Modeli</label>
                            <select name="workModel" value={formData.workModel} onChange={handleChange} className={styles.select}>
                                <option value="Remote">Uzaktan</option>
                                <option value="Hybrid">Hibrit</option>
                                <option value="OnSite">Ofisten</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label>🌐 Dil Seviyesi (İngilizce)</label>
                            <select name="languageLevel" value={formData.languageLevel} onChange={handleChange} className={styles.select}>
                                <option value="A2">A2 – Başlangıç</option>
                                <option value="B1">B1 – Orta</option>
                                <option value="B2">B2 – İleri Orta</option>
                                <option value="C1">C1 – İleri</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Box 2: Content Details */}
                <div className={styles.box}>
                    <div className={styles.boxHeader}>
                        <span className={styles.icon}>📄</span>
                        <h3>İçerik Detayları</h3>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Şirket Hakkında</label>
                        <textarea name="aboutCompany" value={formData.aboutCompany} onChange={handleChange} required placeholder="Şirketinizin vizyonundan, kültüründen ve amacından bahsedin..." className={styles.textarea}></textarea>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Rol Hakkında</label>
                        <textarea name="aboutRole" value={formData.aboutRole} onChange={handleChange} required placeholder="Adayın şirket içindeki konumu ne olacak? Temel amacı nedir?" className={styles.textarea}></textarea>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Sorumluluklar</label>
                        <textarea name="responsibilities" value={formData.responsibilities} onChange={handleChange} required placeholder="• Günlük iş sorumluluklarını yazın..." className={styles.richTextarea}></textarea>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Aranan Nitelikler</label>
                        <textarea name="requiredQualifications" value={formData.requiredQualifications} onChange={handleChange} required placeholder="• Eğitim geçmişi, deneyim süresi, teknik beceriler..." className={styles.richTextarea}></textarea>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Yan Haklar ve Avantajlar (Virgül veya yeni satır ile ayırın)</label>
                        <textarea name="benefits" value={formData.benefits} onChange={handleChange} placeholder="Özel sağlık sigortası, esnek çalışma saatleri, yemek kartı..." className={styles.richTextarea}></textarea>
                    </div>
                </div>

                <div className={styles.submitRow}>
                    <button type="button" onClick={(e) => handleSubmit(e, true)} className={styles.saveDraftBtn} disabled={loading}>
                        {loading ? 'Kaydediliyor...' : 'Taslak Olarak Kaydet'}
                    </button>
                    <button type="submit" className={styles.publishBtn} disabled={loading}>
                        {loading ? 'Yayınlanıyor...' : (isEditMode ? 'İlanı Güncelle' : 'İlanı Yayınla')}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default CreateJob;
