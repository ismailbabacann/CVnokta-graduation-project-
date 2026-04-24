import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import styles from './CompanyLayout.module.css';

// SVG Icons for modern sidebar
const Icons = {
    Logo: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.logoSvg}>
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
        </svg>
    ),
    Dashboard: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
    ),
    Jobs: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
    ),
    AddJob: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
    ),
    Candidates: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
    ),
    BestCandidates: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
    ),
    Help: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
    ),
    Logout: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
    )
};

function CompanyLayout() {
    const location = useLocation();
    const navigate = useNavigate();

    const userName = localStorage.getItem('userName') || 'Değerli İşveren';

    const handleLogout = () => {
        localStorage.removeItem('jwToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userName');
        window.location.href = '/';
    };

    const getPageTitle = () => {
        switch (location.pathname) {
            case '/company': return 'Dashboard';
            case '/company/jobs': return 'İlanlarım';
            case '/company/create-job': return 'Yeni İlan Ver';
            case '/company/candidates': return 'Adaylar';
            case '/company/best-candidates': return 'En İyi Adaylar';
            case '/company/help': return 'İşveren Asistanı';
            default: return 'Şirket Paneli';
        }
    };

    return (
        <div className={styles.layout}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.logoArea} onClick={() => navigate('/')}>
                    <div className={styles.logoIconBg}>
                        <Icons.Logo />
                    </div>
                    <span className={styles.logoText}>HR.ai</span>
                </div>
                
                <div className={styles.navLabel}>İşveren Paneli</div>
                <nav className={styles.nav}>
                    <NavLink to="/company" end className={({ isActive }) => isActive ? `${styles.navItem} ${styles.active}` : styles.navItem}>
                        <span className={styles.navIcon}><Icons.Dashboard /></span>
                        <span className={styles.navText}>Dashboard</span>
                    </NavLink>
                    <NavLink to="/company/jobs" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.active}` : styles.navItem}>
                        <span className={styles.navIcon}><Icons.Jobs /></span>
                        <span className={styles.navText}>İlanlarım</span>
                    </NavLink>
                    <NavLink to="/company/create-job" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.active}` : styles.navItem}>
                        <span className={styles.navIcon}><Icons.AddJob /></span>
                        <span className={styles.navText}>Yeni İlan Ver</span>
                    </NavLink>
                    <NavLink to="/company/candidates" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.active}` : styles.navItem}>
                        <span className={styles.navIcon}><Icons.Candidates /></span>
                        <span className={styles.navText}>Aday Havuzu</span>
                    </NavLink>
                    <NavLink to="/company/best-candidates" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.active}` : styles.navItem}>
                        <span className={styles.navIcon}><Icons.BestCandidates /></span>
                        <span className={styles.navText}>En İyi Adaylar</span>
                    </NavLink>
                    <NavLink to="/company/help" className={({ isActive }) => isActive ? `${styles.navItem} ${styles.active}` : styles.navItem}>
                        <span className={styles.navIcon}><Icons.Help /></span>
                        <span className={styles.navText}>İşveren Asistanı</span>
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
                        <span className={styles.breadcrumb}>Şirket Paneli <span className={styles.separator}>/</span> {getPageTitle()}</span>
                    </div>
                    <div className={styles.headerRight}>
                        <div className={styles.userProfile}>
                            <span className={styles.userName}>
                                {userName}<br />
                                <span>İşveren</span>
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
