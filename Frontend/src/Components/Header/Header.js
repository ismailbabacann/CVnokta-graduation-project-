
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Header.module.css';

function Header() {
  const navigate = useNavigate();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div
          className={styles.logo}
          onClick={() => navigate('/')}
        >
          <span className={styles.logoIcon}>💼</span>
          <h1 className={styles.logoText}>cvnokta</h1>
        </div>
        <p className={styles.tagline}>İş başvurularını tek yerden yönet</p>
      </div>
    </header>
  );
}

export default Header;
