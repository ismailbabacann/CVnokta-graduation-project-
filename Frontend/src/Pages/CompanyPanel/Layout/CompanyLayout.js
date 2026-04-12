import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import styles from './CompanyLayout.module.css';

function CompanyLayout() {
    const location = useLocation();
    const navigate = useNavigate();

    // Get the User's name from localStorage (defaults to "İnsan Kaynakları" if not found)
    const userName = localStorage.getItem('userName') || 'İnsan Kaynakları';

    const handleLogout = () => {
        localStorage.removeItem('jwToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userName');
        window.location.href = '/';
    };

    const getPageTitle = () => {
        switch (location.pathname) {
            case '/company': return 'Panel';
            case '/company/jobs': return 'İş İlanları';
            case '/company/candidates': return 'Aday Havuzu';
            case '/company/create-job': return 'Yeni İş İlanı';
            default: return 'Panel';
        }
    };

    return (
        <div className={styles.layout}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <span className={styles.logoIcon}>💼</span> hr.ai
                </div>
                <nav className={styles.nav}>
                    <NavLink to="/company" end className={({ isActive }) => isActive ? `${styles.navItem} ${styles.active}` : styles.navItem}>
                        <span className={styles.navIcon}>🏠</span> Panel
                    </NavLink>
                    <NavLink to="/company/jobs" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.active}` : styles.navItem}>
                        <span className={styles.navIcon}>📋</span> İş İlanları
                    </NavLink>
                    <NavLink to="/company/candidates" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.active}` : styles.navItem}>
                        <span className={styles.navIcon}>👥</span> Aday Havuzu
                    </NavLink>
                    <NavLink to="/company/help" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.active}` : styles.navItem}>
                        <span className={styles.navIcon}>❓</span> Yardım & Destek
                    </NavLink>
                </nav>
                <div style={{ marginTop: 'auto', padding: '20px' }}>
                    <button 
                        onClick={handleLogout} 
                        style={{ width: '100%', padding: '12px', background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(239,68,68,0.1)' }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#fecaca'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#fee2e2'}
                    >
                        <span>🚪</span> Çıkış Yap
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={styles.mainContent}>
                {/* Top Header */}
                <header className={styles.topHeader}>
                    <div className={styles.headerLeft}>
                        <span className={styles.breadcrumb}>hr.ai &nbsp;/&nbsp; {getPageTitle()}</span>
                    </div>
                    <div className={styles.headerRight}>
                        <div className={styles.userProfile}>
                            <span className={styles.userName}>
                                {userName}<br />
                                <span>Admin</span>
                            </span>
                            <div className={styles.avatar}>{userName.charAt(0).toUpperCase()}</div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className={styles.pageContent}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default CompanyLayout;
