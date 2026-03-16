import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Header.module.css';

function Header({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    if (location.pathname !== '/') {
      setActiveSection('');
      return;
    }

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200; // offset for header height
      const aboutEl = document.getElementById('about');
      const faqEl = document.getElementById('faq');

      if (faqEl && scrollPosition >= faqEl.offsetTop) {
        setActiveSection('faq');
      } else if (aboutEl && scrollPosition >= aboutEl.offsetTop) {
        setActiveSection('about');
      } else {
        setActiveSection('home');
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Trigger immediately to check position on load

    return () => window.removeEventListener('scroll', handleScroll);
  }, [location]);

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
          <h1 className={styles.logoText}>hr.ai</h1>
        </div>

        <nav className={styles.nav}>
          <button
            className={`${styles.navLink} ${activeSection === 'home' ? styles.active : ''}`}
            onClick={() => {
              navigate('/');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            Home
          </button>

          <button
            className={`${styles.navLink} ${activeSection === 'about' ? styles.active : ''}`}
            onClick={() => {
              navigate('/');
              setTimeout(() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }), 100);
            }}
          >
            About Us
          </button>
          
          <button
            className={`${styles.navLink} ${activeSection === 'faq' ? styles.active : ''}`}
            onClick={() => {
              navigate('/');
              setTimeout(() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' }), 100);
            }}
          >
            FAQ
          </button>

          <button
            className={`${styles.navLink} ${location.pathname === '/insights' ? styles.active : ''}`}
            onClick={() => navigate('/insights')}
          >
            Insights
          </button>
          
          <button
            className={`${styles.navLink} ${location.pathname === '/jobs' ? styles.active : ''}`}
            onClick={() => navigate('/jobs')}
          >
            All Jobs
          </button>
        </nav>

        <div className={styles.authButtons}>
          {user ? (
            <button className={styles.signupBtn} onClick={() => navigate('/')}>
              Hesabım
            </button>
          ) : (
            <>
              <button className={styles.loginBtn} onClick={() => navigate('/login')}>
                Login
              </button>
              <button className={styles.signupBtn} onClick={() => navigate('/signup')}>
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
