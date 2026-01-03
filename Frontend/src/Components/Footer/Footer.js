import React from 'react';
import styles from './Footer.module.css';

function Footer() {
  return (
    <footer className={styles.footer}>
      <small>© {new Date().getFullYear()} cvnokta – Tüm hakları saklıdır.</small>
    </footer>
  );
}

export default Footer;
