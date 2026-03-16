import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import styles from './ResetPassword.module.css';

function ResetPassword() {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [formData, setFormData] = useState({
        email: '',
        token: '',
        password: '',
        confirmPassword: ''
    });
    
    const [status, setStatus] = useState({ type: '', message: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Extract email and token from URL query parameters
        const searchParams = new URLSearchParams(location.search);
        const emailParam = searchParams.get('email');
        const tokenParam = searchParams.get('token'); // or 'code' depending on backend

        if (emailParam && tokenParam) {
            setFormData(prev => ({
                ...prev,
                email: emailParam,
                token: tokenParam
            }));
        } else {
            setStatus({ type: 'error', message: 'Geçersiz veya eksik sıfırlama bağlantısı. Lütfen e-postanızdaki linke tekrar tıklayın.' });
        }
    }, [location]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.password || !formData.confirmPassword) {
            setStatus({ type: 'error', message: 'Lütfen tüm alanları doldurun.' });
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setStatus({ type: 'error', message: 'Şifreler birbiriyle eşleşmiyor.' });
            return;
        }

        if (formData.password.length < 6) {
            setStatus({ type: 'error', message: 'Şifreniz en az 6 karakter olmalıdır.' });
            return;
        }

        setLoading(true);
        setStatus({ type: '', message: '' });

        try {
            await axios.post('https://localhost:9001/api/Account/reset-password', {
                email: formData.email,
                token: formData.token,
                password: formData.password,
                confirmPassword: formData.confirmPassword
            });

            setStatus({ 
                type: 'success', 
                message: 'Şifreniz başarıyla güncellendi! Giriş sayfasına yönlendiriliyorsunuz...' 
            });
            
            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (err) {
            console.error('Reset password error:', err);
            if (err.response && err.response.data && err.response.data.message) {
                setStatus({ type: 'error', message: err.response.data.message });
            } else {
                setStatus({ type: 'error', message: 'Şifre sıfırlanırken bir hata oluştu. Bağlantınızın süresi dolmuş olabilir.' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <form className={styles.formContainer} onSubmit={handleSubmit}>
                <h2 className={styles.title}>Yeni Şifre Belirle</h2>
                <p className={styles.subtitle}>Lütfen güvenli ve en az 6 karakter uzunluğunda yeni bir şifre girin.</p>

                {status.message && (
                    <div className={status.type === 'error' ? styles.error : styles.success}>
                        {status.message}
                    </div>
                )}

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Yeni Şifre</label>
                    <input
                        type="password"
                        name="password"
                        placeholder="••••••••"
                        className={styles.input}
                        value={formData.password}
                        onChange={handleChange}
                        disabled={loading || status.type === 'success' || !formData.token}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Yeni Şifre (Tekrar)</label>
                    <input
                        type="password"
                        name="confirmPassword"
                        placeholder="••••••••"
                        className={styles.input}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        disabled={loading || status.type === 'success' || !formData.token}
                    />
                </div>

                <div className={styles.buttonContainer}>
                    <button 
                        type="submit" 
                        className={styles.submitBtn} 
                        disabled={loading || status.type === 'success' || !formData.token}
                    >
                        {loading ? 'Güncelleniyor...' : 'Şifremi Sıfırla'}
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

export default ResetPassword;
