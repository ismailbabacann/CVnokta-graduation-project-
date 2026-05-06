import React from 'react';
import styles from './CompanyDashboard.module.css';

function CompanyDashboard() {
    return (
        <div className={styles.dashboardContainer}>
            <div className={styles.welcomeCard}>
                <div className={styles.welcomeContent}>
                    <div className={styles.badge}>
                        <span className={styles.sparkleIcon}>✨</span> 
                        Employer Portal
                    </div>
                    <h1 className={styles.welcomeTitle}>
                        Accelerate Your Recruitment<br/>
                        <span className={styles.textHighlight}>Processes with AI</span>
                    </h1>
                    <p className={styles.welcomeText}>
                        Welcome to the <b>hr.ai</b> platform. Manage candidate filtering, competency analysis, and interview organizations with a single click thanks to our smart algorithms.
                    </p>
                    
                    <div className={styles.statsContainer}>
                        <div className={styles.statBox}>
                            <div className={styles.statIcon}>📝</div>
                            <div className={styles.statInfo}>
                                <h3>Automated Analysis</h3>
                                <p>CV scanning in seconds</p>
                            </div>
                        </div>
                        <div className={styles.statBox}>
                            <div className={styles.statIcon}>🎯</div>
                            <div className={styles.statInfo}>
                                <h3>Accurate Matching</h3>
                                <p>Most suitable candidates for the job</p>
                            </div>
                        </div>
                        <div className={styles.statBox}>
                            <div className={styles.statIcon}>📊</div>
                            <div className={styles.statInfo}>
                                <h3>Detailed Reports</h3>
                                <p>Data-driven decision making</p>
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
