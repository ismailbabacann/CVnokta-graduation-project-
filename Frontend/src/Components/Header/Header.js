import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Header.module.css';

function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div
          className={styles.logo}
          onClick={() => navigate('/')}
        >
          <div className={styles.logoIconContainer}>
            <span className={styles.logoIcon}>h</span>
          </div>
          <h1 className={styles.logoText}>cv nokta</h1>
        </div>

        <nav className={styles.nav}>
          <button
            className={`${styles.navLink} ${location.pathname === '/' ? styles.active : ''}`}
            onClick={() => navigate('/')}
          >
            Home
          </button>
          <button
            className={`${styles.navLink} ${location.pathname === '/jobs' ? styles.active : ''}`}
            onClick={() => navigate('/jobs')}
          >
            All Jobs
          </button>
          <button className={styles.navLink}>
            Dashboard
          </button>
        </nav>

        <div className={styles.authButtons}>
          <button className={styles.loginBtn}>Login</button>
          <button className={styles.signupBtn}>Sign Up</button>
        </div>
      </div>
    </header>
  );
}

export default Header;
