import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import styles from './UserLayout.module.css';

// SVG Icons for modern sidebar
const Icons = {
    Logo: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.logoSvg}>
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
        </svg>
    ),
    Profile: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
    ),
    Apps: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
    ),
    Jobs: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
    ),
    Help: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
    ),
    Logout: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
    )
};

function UserLayout() {
    const location = useLocation();
    const navigate = useNavigate();

    // Get the User's name from localStorage (or fallback)
    const userName = localStorage.getItem('userName') || 'Değerli Kullanıcı';

    const handleLogout = () => {
        localStorage.removeItem('jwToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userName');
        window.location.href = '/';
    };

    const getPageTitle = () => {
        switch (location.pathname) {
            case '/profile': 
            case '/profile/me': return 'Profilim';
            case '/profile/applications': return 'Başvurduğum İlanlar';
            case '/profile/jobs': return 'Tüm İlanlar';
            case '/profile/help': return 'Yardım Merkezi';
            default: return 'Profilim';
        }
    };

    return (
        <div className={styles.layout}>
            {/* Modern Glassmorphism Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.logoArea} onClick={() => navigate('/')}>
                    <div className={styles.logoIconBg}>
                        <Icons.Logo />
                    </div>
                    <span className={styles.logoText}>HR.ai</span>
                </div>
                
                <div className={styles.navLabel}>Ana Menü</div>
                <nav className={styles.nav}>
                    <NavLink to="/profile/me" className={({ isActive }) => isActive || location.pathname === '/profile' ? `${styles.navItem} ${styles.active}` : styles.navItem}>
                        <span className={styles.navIcon}><Icons.Profile /></span>
                        <span className={styles.navText}>Profilim</span>
                    </NavLink>
                    <NavLink to="/profile/applications" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.active}` : styles.navItem}>
                        <span className={styles.navIcon}><Icons.Apps /></span>
                        <span className={styles.navText}>Başvurduğum İlanlar</span>
                    </NavLink>
                    <NavLink to="/profile/jobs" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.active}` : styles.navItem}>
                        <span className={styles.navIcon}><Icons.Jobs /></span>
                        <span className={styles.navText}>Tüm İlanlar</span>
                    </NavLink>
                    <NavLink to="/profile/help" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.active}` : styles.navItem}>
                        <span className={styles.navIcon}><Icons.Help /></span>
                        <span className={styles.navText}>Yardım Merkezi</span>
                    </NavLink>
                </nav>

                <div className={styles.sidebarBottom}>
                    <button className={styles.logoutBtn} onClick={handleLogout}>
                        <span className={styles.navIcon}><Icons.Logout /></span>
                        <span className={styles.navText}>Çıkış Yap</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={styles.mainContent}>
                {/* Top Header */}
                <header className={styles.topHeader}>
                    <div className={styles.headerLeft}>
                        <span className={styles.breadcrumb}>Hesabım <span className={styles.separator}>/</span> {getPageTitle()}</span>
                    </div>
                    <div className={styles.headerRight}>
                        <div className={styles.userProfile}>
                            <span className={styles.userName}>
                                {userName}<br />
                                <span>Aday Kullanıcı</span>
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
