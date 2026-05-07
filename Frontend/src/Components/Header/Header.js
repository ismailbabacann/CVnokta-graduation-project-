import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Header.module.css';

function Header({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('home');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (location.pathname !== '/') {
      setActiveSection('');
      return;
    }

    const handleScroll = () => {
      // Add sticky shadow if scrolled
      setScrolled(window.scrollY > 20);

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
    <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ''}`}>
      <div className={styles.container}>
        <div
          className={styles.logoArea}
          onClick={() => navigate('/')}
        >
          <div className={styles.logoIconBg}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.logoSvg}>
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
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
            Ana Sayfa
          </button>

          <button
            className={`${styles.navLink} ${activeSection === 'about' ? styles.active : ''}`}
            onClick={() => {
              navigate('/');
              setTimeout(() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }), 100);
            }}
          >
            Hakkımızda
          </button>
          
          <button
            className={`${styles.navLink} ${activeSection === 'faq' ? styles.active : ''}`}
            onClick={() => {
              navigate('/');
              setTimeout(() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' }), 100);
            }}
          >
            S.S.S.
          </button>

          <button
            className={`${styles.navLink} ${location.pathname === '/insights' ? styles.active : ''}`}
            onClick={() => navigate('/insights')}
          >
            İstatistikler
          </button>
          
          <button
            className={`${styles.navLink} ${location.pathname === '/jobs' ? styles.active : ''}`}
            onClick={() => navigate('/jobs')}
          >
            Tüm İlanlar
          </button>
        </nav>

        <div className={styles.authButtons}>
          {user ? (
            <button className={styles.accountBtn} onClick={() => navigate('/profile')}>
              <span className={styles.btnIcon}>👤</span>
              <span className={styles.btnText}>Hesabım</span>
            </button>
          ) : (
            <>
              <button className={styles.loginBtn} onClick={() => navigate('/login')}>
                Giriş Yap
              </button>
              <button className={styles.signupBtn} onClick={() => navigate('/signup')}>
                Kayıt Ol
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
