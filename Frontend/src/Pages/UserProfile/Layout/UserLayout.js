import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import styles from './UserLayout.module.css';

function UserLayout() {
    const location = useLocation();
    const navigate = useNavigate();

    // Get the User's name from localStorage (or fallback)
    const userName = localStorage.getItem('userName') || 'Değerli Kullanıcı';

    const handleLogout = () => {
        localStorage.removeItem('jwToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userName');
        navigate('/login');
    };

    const getPageTitle = () => {
        switch (location.pathname) {
            case '/profile': 
            case '/profile/me': return 'Profilim';
            case '/profile/applications': return 'Başvurduğum İlanlar';
            case '/profile/jobs': return 'Tüm İlanlar';
            case '/profile/help': return 'Yardım';
            default: return 'Profilim';
        }
    };

    return (
        <div className={styles.layout}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.logo} onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    <span className={styles.logoIcon}>👤</span> hr.ai
                </div>
                <nav className={styles.nav}>
                    <NavLink to="/profile/me" className={({ isActive }) => isActive || location.pathname === '/profile' ? `${styles.navItem} ${styles.active}` : styles.navItem}>
                        <span className={styles.navIcon}>🧑‍💼</span> Profilim
                    </NavLink>
                    <NavLink to="/profile/applications" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.active}` : styles.navItem}>
                        <span className={styles.navIcon}>📋</span> Başvurduğum İlanlar
                    </NavLink>
                    <NavLink to="/profile/jobs" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.active}` : styles.navItem}>
                        <span className={styles.navIcon}>🔍</span> Tüm İlanlar
                    </NavLink>
                    <NavLink to="/profile/help" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.active}` : styles.navItem}>
                        <span className={styles.navIcon}>❓</span> Yardım
                    </NavLink>
                </nav>
                <div className={styles.sidebarBottom}>
                    <button className={styles.logoutBtn} onClick={handleLogout}>
                        <span className={styles.navIcon}>🚪</span> Çıkış Yap
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={styles.mainContent}>
                {/* Top Header */}
                <header className={styles.topHeader}>
                    <div className={styles.headerLeft}>
                        <span className={styles.breadcrumb}>Hesabım &nbsp;/&nbsp; {getPageTitle()}</span>
                    </div>
                    <div className={styles.headerRight}>
                        <div className={styles.userProfile}>
                            <span className={styles.userName}>
                                {userName}<br />
                                <span>Kullanıcı</span>
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

export default UserLayout;
