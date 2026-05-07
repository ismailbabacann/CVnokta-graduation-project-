import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './UserDashboard.module.css';

function UserDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalApplications: 0,
        pendingInterviews: 0,
        accepted: 0,
        rejected: 0
    });
    const [recentApps, setRecentApps] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userName, setUserName] = useState('');

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const token = localStorage.getItem('jwToken');
                const name = localStorage.getItem('userName') || 'User';
                setUserName(name);

                if (!token) {
                    setIsLoading(false);
                    return;
                }

                const payload = JSON.parse(atob(token.split('.')[1]));
                const candidateId = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.uid || payload.sub;

                // Get candidate's applications
                const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/v1/Applications/my-applications/${candidateId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const applications = response.data.data || response.data || [];

                let accepted = 0;
                let rejected = 0;
                let pendingInterviews = 0;

                applications.forEach(app => {
                    if (app.applicationStatus === 'HIRED' || app.applicationStatus === 'OFFERED') accepted++;
                    if (app.applicationStatus === 'REJECTED') rejected++;
                    if (app.currentPipelineStage === 'AI_INTERVIEW' || app.currentPipelineStage === 'ENGLISH_TEST' || app.currentPipelineStage === 'HR_INTERVIEW') {
                         pendingInterviews++;
                    }
                });

                setStats({
                    totalApplications: applications.length,
                    pendingInterviews,
                    accepted,
                    rejected
                });

                // Top 3 recent apps
                setRecentApps(applications.slice(0, 3));
            } catch (error) {
                console.error('Error fetching dashboard data', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (isLoading) return <div style={{ padding: '2rem' }}>Kontrol Paneli Yükleniyor...</div>;

    return (
        <div className={styles.dashboardContainer}>
            <div className={styles.welcomeSection}>
                <h2>Merhaba, {userName} 👋</h2>
                <p>Kariyer yolculuğunuzun güncel durumunu buradan takip edebilirsiniz.</p>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: '#e0f2fe', color: '#0284c7' }}>📄</div>
                    <div className={styles.statInfo}>
                        <div className={styles.statLabel}>Toplam Başvuru</div>
                        <div className={styles.statValue}>{stats.totalApplications}</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: '#fef9c3', color: '#ca8a04' }}>⏳</div>
                    <div className={styles.statInfo}>
                        <div className={styles.statLabel}>Bekleyen Aşamalar</div>
                        <div className={styles.statValue}>{stats.pendingInterviews}</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: '#dcfce7', color: '#16a34a' }}>🎉</div>
                    <div className={styles.statInfo}>
                        <div className={styles.statLabel}>Kabul Edilen</div>
                        <div className={styles.statValue}>{stats.accepted}</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: '#fee2e2', color: '#dc2626' }}>❌</div>
                    <div className={styles.statInfo}>
                        <div className={styles.statLabel}>Reddedilen</div>
                        <div className={styles.statValue}>{stats.rejected}</div>
                    </div>
                </div>
            </div>

            <div className={styles.contentGrid}>
                <div className={styles.recentAppsBox}>
                    <div className={styles.boxHeader}>
                        <h3>Son Başvurularınız</h3>
                        <button onClick={() => navigate('/profile/applications')} className={styles.viewAllBtn}>Tümünü Gör</button>
                    </div>
                    
                    {recentApps.length > 0 ? (
                        <div className={styles.appList}>
                            {recentApps.map((app, index) => (
                                <div key={index} className={styles.appItem}>
                                    <div className={styles.appInfo}>
                                        <h4>{app.jobTitle || 'Bilinmeyen İlan'}</h4>
                                        <p>{app.department || 'Sistem İlanı'}</p>
                                    </div>
                                    <div className={styles.appStatus}>
                                        <span className={styles.statusBadge} data-status={app.applicationStatus}>
                                            {app.applicationStatus}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <p>Henüz hiçbir işe başvurmadınız.</p>
                            <button onClick={() => navigate('/profile/jobs')} className={styles.exploreBtn}>İlanları Keşfet</button>
                        </div>
                    )}
                </div>

                <div className={styles.actionBox}>
                    <h3>Hızlı İşlemler</h3>
                    <div className={styles.actionList}>
                        <button onClick={() => navigate('/profile/me')} className={styles.actionBtn}>
                            <span className={styles.actionIcon}>👤</span>
                            <div className={styles.actionText}>
                                <strong>Profilinizi Güncelleyin</strong>
                                <span>CV ve bilgilerinizi güncel tutun</span>
                            </div>
                        </button>
                        <button onClick={() => navigate('/profile/jobs')} className={styles.actionBtn}>
                            <span className={styles.actionIcon}>🔍</span>
                            <div className={styles.actionText}>
                                <strong>Yeni İş Bulun</strong>
                                <span>AI tarafından eşleştirilen ilanları inceleyin</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UserDashboard;
