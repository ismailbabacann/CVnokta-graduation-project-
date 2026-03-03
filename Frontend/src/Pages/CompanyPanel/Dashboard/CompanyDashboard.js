import React from 'react';
import styles from './CompanyDashboard.module.css';

function CompanyDashboard() {
    return (
        <div className={styles.welcomeContainer}>
            <div className={styles.welcomeCard}>
                <div className={styles.iconWrapper}>
                    <span className={styles.sparkleIcon}>✨</span>
                </div>
                <h1 className={styles.welcomeTitle}>Platforma Hoş Geldiniz!</h1>
                <p className={styles.welcomeText}>
                    <b>hr.ai</b> kullanmak, işe alım sürecinizde yaşayacağınız en pratik ve verimli deneyim olacak.
                </p>
                <div className={styles.illustrationPlaceholder}>
                    Yapay Zeka Destekli İK Asistanınız Sizin İçin Çalışıyor
                </div>
            </div>
        </div>
    );
}

export default CompanyDashboard;
