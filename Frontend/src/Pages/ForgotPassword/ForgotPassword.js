import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './ForgotPassword.module.css';

function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState({ type: '', message: '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!email) {
            setStatus({ type: 'error', message: 'Lütfen e-posta adresinizi giriniz.' });
            return;
        }

        setLoading(true);
        setStatus({ type: '', message: '' });

        try {
            await axios.post('https://localhost:9001/api/Account/forgot-password', {
                email: email
            });

            setStatus({ 
                type: 'success', 
                message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. (Geliştirme ortamı: Konsolu veya Backend loglarını kontrol ediniz.)' 
            });
            
            // In a real app we might redirect to login immediately, but here we want them to read the message and find the link.
            setTimeout(() => {
                navigate('/login');
            }, 5000);

        } catch (err) {
            console.error('Forgot password error:', err);
            if (err.response && err.response.data && err.response.data.message) {
                setStatus({ type: 'error', message: err.response.data.message });
            } else {
                setStatus({ type: 'error', message: 'Bir hata oluştu. Hesabınızın sistemde kayıtlı olduğundan emin olun.' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <form className={styles.formContainer} onSubmit={handleSubmit}>
                <h2 className={styles.title}>Şifremi Unuttum</h2>
                <p className={styles.subtitle}>Hesabınıza bağlı e-posta adresini girin, size şifre sıfırlama bağlantısı gönderelim.</p>

                {status.message && (
                    <div className={status.type === 'error' ? styles.error : styles.success}>
                        {status.message}
                    </div>
                )}

                <div className={styles.inputGroup}>
                    <label className={styles.label}>E-Posta Adresiniz</label>
                    <input
                        type="email"
                        placeholder="ornek@sirket.com"
                        className={styles.input}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading || status.type === 'success'}
                    />
                </div>

                <div className={styles.buttonContainer}>
                    <button 
                        type="submit" 
                        className={styles.submitBtn} 
                        disabled={loading || status.type === 'success'}
                    >
                        {loading ? 'Gönderiliyor...' : 'Sıfırlama Linki Gönder'}
                    </button>
                    <button 
                        type="button" 
                        className={styles.backBtn}
                        onClick={() => navigate('/login')}
                    >
                        Giriş Ekranına Dön
                    </button>
                </div>
            </form>
        </div>
    );
}

export default ForgotPassword;
