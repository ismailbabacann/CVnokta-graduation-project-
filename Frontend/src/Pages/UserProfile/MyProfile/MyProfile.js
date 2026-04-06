import React, { useState } from 'react';
import styles from './MyProfile.module.css';

function MyProfile() {
    const [formData, setFormData] = useState({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+90 555 123 4567',
        location: 'İstanbul, Türkiye',
        linkedin: 'https://linkedin.com/in/johndoe',
        coverLetter: 'Merhaba, şirketinizde açılan bu pozisyonla yakından ilgileniyorum. Ekteki CV\'mden de inceleyebileceğiniz üzere daha önce benzer projelerde yer aldım.'
    });

    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSaving(true);
        // Simulate API call
        setTimeout(() => {
            setIsSaving(false);
            alert('Profil bilgileriniz başarıyla güncellendi!');
        }, 1000);
    };

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
                                <span className={styles.fileName}>Mevcut Yüklü CV: <strong>John_Doe_CV.pdf</strong></span>
                                <input type="file" id="cvUpload" className={styles.fileInput} accept=".pdf,.doc,.docx" />
                                <label htmlFor="cvUpload" className={styles.uploadBtn}>Yeni CV Yükle</label>
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
