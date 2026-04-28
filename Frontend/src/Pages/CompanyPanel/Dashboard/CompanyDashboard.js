import React from 'react';
import styles from './CompanyDashboard.module.css';

function CompanyDashboard() {
    return (
        <div className={styles.dashboardContainer}>
            <div className={styles.welcomeCard}>
                <div className={styles.welcomeContent}>
                    <div className={styles.badge}>
                        <span className={styles.sparkleIcon}>✨</span> 
                        İşveren Portalı
                    </div>
                    <h1 className={styles.welcomeTitle}>
                        İşe Alım Süreçlerinizi<br/>
                        <span className={styles.textHighlight}>Yapay Zeka ile Hızlandırın</span>
                    </h1>
                    <p className={styles.welcomeText}>
                        <b>hr.ai</b> platformuna hoş geldiniz. Akıllı algoritmalarımız sayesinde 
                        aday filtreleme, yetkinlik analizi ve mülakat organizasyonlarını tek tıkla yönetin.
                    </p>
                    
                    <div className={styles.statsContainer}>
                        <div className={styles.statBox}>
                            <div className={styles.statIcon}>📝</div>
                            <div className={styles.statInfo}>
                                <h3>Otomatik Analiz</h3>
                                <p>Saniyeler içinde CV taraması</p>
                            </div>
                        </div>
                        <div className={styles.statBox}>
                            <div className={styles.statIcon}>🎯</div>
                            <div className={styles.statInfo}>
                                <h3>Doğru Eşleşme</h3>
                                <p>İlana en uygun adaylar</p>
                            </div>
                        </div>
                        <div className={styles.statBox}>
                            <div className={styles.statIcon}>📊</div>
                            <div className={styles.statInfo}>
                                <h3>Detaylı Raporlar</h3>
                                <p>Veriye dayalı karar alma</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className={styles.welcomeIllustration}>
                    <div className={styles.glassCircle}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CompanyDashboard;
