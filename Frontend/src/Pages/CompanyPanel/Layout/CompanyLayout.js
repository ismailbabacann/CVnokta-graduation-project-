import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import styles from './CompanyLayout.module.css';

function CompanyLayout() {
    const location = useLocation();

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
                </nav>
            </aside>

            {/* Main Content Area */}
            <div className={styles.mainContent}>
                {/* Top Header */}
                <header className={styles.topHeader}>
                    <div className={styles.headerLeft}>
                        <span className={styles.breadcrumb}>hr.ai &nbsp;/&nbsp; {getPageTitle()}</span>
                    </div>
                    <div className={styles.headerRight}>
                        <span className={styles.notificationIcon}>🔔</span>
                        <div className={styles.userProfile}>
                            <span className={styles.userName}>İnsan Kaynakları<br /><span>Admin</span></span>
                            <div className={styles.avatar}>İK</div>
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
