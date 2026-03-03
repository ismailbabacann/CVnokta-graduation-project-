import React, { useState } from 'react';
import styles from './CreateJob.module.css';

function CreateJob() {
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitted(true);
        // Scroll to top
        window.scrollTo(0, 0);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText('hr.ai/jobs/ilan-74892');
        alert("Link kopyalandı!");
    };

    if (isSubmitted) {
        return (
            <div className={styles.container}>
                <div className={styles.successCard}>
                    <div className={styles.successIcon}>✓</div>
                    <h2 className={styles.successTitle}>İlanınız Başarıyla Yayınlanmıştır!</h2>
                    <p className={styles.successText}>
                        Artık bu ilanı adaylarla paylaşabilir ve başvuruları toplamaya başlayabilirsiniz.
                    </p>

                    <div className={styles.linkContainer}>
                        <span className={styles.linkText}>hr.ai/jobs/ilan-74892</span>
                        <button className={styles.copyBtn} onClick={handleCopy}>Kopyala</button>
                    </div>

                    <div className={styles.actionButtons}>
                        <button
                            className={styles.newJobBtn}
                            onClick={() => setIsSubmitted(false)}
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
                    <h2 className={styles.title}>Yeni İş İlanı Oluştur</h2>
                    <p className={styles.subtitle}>Şirketiniz için doğru yeteneği bulmak adına ilanın temel detaylarını girin.</p>
                </div>
            </div>

            <form className={styles.formContainer} onSubmit={handleSubmit}>
                {/* Box 1: Temel Bilgiler */}
                <div className={styles.box}>
                    <div className={styles.boxHeader}>
                        <span className={styles.icon}>ℹ️</span>
                        <h3>Temel Açıklamalar</h3>
                    </div>
                    <div className={styles.formGroup}>
                        <label>İlan Başlığı</label>
                        <input required type="text" placeholder="Örn: Kıdemli Yazılım Mühendisi" className={styles.input} />
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label>Departman</label>
                            <input required type="text" placeholder="Örn: Mühendislik" className={styles.input} />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Konum</label>
                            <input required type="text" placeholder="Örn: İstanbul / Maslak" className={styles.input} />
                        </div>
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label>Çalışma Şekli</label>
                            <select className={styles.select}>
                                <option>Tam Zamanlı</option>
                                <option>Yarı Zamanlı</option>
                                <option>Stajyer</option>
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Çalışma Modeli</label>
                            <select className={styles.select}>
                                <option>Hibrit</option>
                                <option>Uzaktan (Remote)</option>
                                <option>Ofis</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Box 2: İçerik Detayları */}
                <div className={styles.box}>
                    <div className={styles.boxHeader}>
                        <span className={styles.icon}>📄</span>
                        <h3>İçerik Detayları</h3>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Şirket Hakkında</label>
                        <textarea required placeholder="Şirketinizin vizyonundan, kültüründen ve amacından bahsedin..." className={styles.textarea}></textarea>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Rol Hakkında (About Role)</label>
                        <textarea required placeholder="Adayın bu rolde şirket içindeki konumu ne olacak? Temel amacı nedir?" className={styles.textarea}></textarea>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Sorumluluklar (Madde Madde)</label>
                        <textarea required placeholder="• Günlük iş sorumluluklarını yazın..." className={styles.richTextarea}></textarea>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Beklenen Nitelikler (Qualifications)</label>
                        <textarea required placeholder="• Öğrenim durumu, deneyim süresi, teknik yetenekler..." className={styles.richTextarea}></textarea>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Yan Haklar (Benefits)</label>
                        <textarea placeholder="• Özel sağlık sigortası, esnek mesai vb..." className={styles.richTextarea}></textarea>
                    </div>
                </div>

                <div className={styles.submitRow}>
                    <button type="button" className={styles.saveDraftBtn}>Vazgeç</button>
                    <button type="submit" className={styles.publishBtn}>İlanı Yayınla</button>
                </div>
            </form>
        </div>
    );
}

export default CreateJob;
