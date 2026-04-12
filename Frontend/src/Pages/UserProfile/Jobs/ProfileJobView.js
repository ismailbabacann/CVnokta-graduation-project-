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

    const handleFastApply = async () => {
        setIsApplying(true);
        try {
            const token = localStorage.getItem('jwToken');
            let candidateId = null;
            let email = '';
            let fullName = localStorage.getItem('userName') || 'Aday';

            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                candidateId = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.uid || payload.sub;
                email = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || payload.email || 'ornek@email.com';
            }

            const payloadData = {
                jobPostingId: id,
                candidateId: candidateId,
                fullName: fullName,
                email: email || 'ornek@email.com',
                phone: "05000000000",
                location: "Türkiye",
                linkedInProfile: "",
                coverLetter: "Profilimdeki bilgilerle hızlı başvuru yapıyorum.",
                cvUrl: ""
            };

            await axios.post('https://localhost:9001/api/v1/Applications/public/apply', payloadData);
            
            alert('Tebrikler! Profilinizdeki mevcut CV ve bilgileriniz kullanılarak başvurunuz başarıyla iletildi. Sürecinizi "Başvurduğum İlanlar" alanından takip edebilirsiniz.');
            navigate('/profile/applications');
        } catch (err) {
            console.error('Başvuru hatası:', err);
            alert('Başvuru sırasında bir hata oluştu veya zaten başvurdunuz.');
        } finally {
            setIsApplying(false);
        }
    };

    if (loading) {
        return <div className={styles.centeredMessage}>Detaylar Yükleniyor...</div>;
    }

    if (error || !job) {
        return <div className={`${styles.centeredMessage} ${styles.errorMessage}`}>{error || 'İlan bulunamadı.'}</div>;
    }

    return (
        <div className={styles.jobviewContainer}>
            <button className={styles.backBtn} onClick={() => navigate('/profile/jobs')}>
                ← İlanlara Dön
            </button>

            <section className={styles.jobHeader}>
                <h1>{job.jobTitle}</h1>
                <p className={styles.jobDepartment}>{job.companyName || 'Şirket Gizli'} - {job.department}</p>
                <div className={styles.jobMeta}>
                    <span>📍 {job.location || 'Belirtilmedi'}</span>
                    <span>💼 {job.workType || 'Tam Zamanlı'}</span>
                    <span>🌍 {job.workModel || 'Hibrit'}</span>
                </div>
            </section>

            <section className={styles.jobSection}>
                <h2>İş Tanımı Hakkında</h2>
                <p>{job.description || job.aboutRole || 'Detaylı bir ilan metni sisteme henüz girilmemiş.'}</p>
            </section>

            {job.aboutCompany && (
                <section className={styles.jobSection}>
                    <h2>Şirket Hakkında</h2>
                    <p>{job.aboutCompany}</p>
                </section>
            )}

            {job.responsibilities && (
                <section className={styles.jobSection}>
                    <h2>Sorumluluklar</h2>
                    <p>{job.responsibilities}</p>
                </section>
            )}

            {job.requiredQualifications && (
                <section className={styles.jobSection}>
                    <h2>Aranan Nitelikler</h2>
                    <p>{job.requiredQualifications}</p>
                </section>
            )}

            {job.benefits && job.benefits.length > 0 && (
                <section className={styles.jobSection}>
                    <h2>Yan Haklar ve Avantajlar</h2>
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
                    <p>Sistemde kayıtlı önyazınız, eğitim bilgileriniz ve güncel özgeçmiş dosyanız bu ilan için şirkete doğrudan iletilecektir. Hızlı başvuru işlemini aşağıdan tamamlayabilirsiniz.</p>
                </div>
                {job.status === 'Active' ? (
                    <button 
                        className={styles.fastApplyBtn} 
                        onClick={handleFastApply}
                        disabled={isApplying}
                    >
                        {isApplying ? 'Başvuru İletiliyor...' : 'Profil Bilgilerimle Bu İlana Başvur'}
                    </button>
                ) : (
                    <button 
                        className={styles.fastApplyBtn} 
                        style={{backgroundColor: '#cbd5e1', cursor: 'not-allowed', color: '#475569'}}
                        disabled
                    >
                        İlan Kapalıdır (Closed)
                    </button>
                )}
            </div>
        </div>
    );
}

export default ProfileJobView;
