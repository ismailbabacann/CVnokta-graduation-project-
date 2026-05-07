import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './Signup.module.css';

function Signup({ setUser }) {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        userName: '',
        email: '',
        password: '',
        confirmPassword: '',
        userRole: 'Basic'
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [confirmationLink, setConfirmationLink] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setConfirmationLink('');

        // Basic validation
        if (!formData.firstName || !formData.lastName || !formData.userName ||
            !formData.email || !formData.password || !formData.confirmPassword) {
            setError('Lütfen tüm zorunlu alanları doldurun.');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Şifreler eşleşmiyor.');
            return;
        }

        if (formData.password.length < 6) {
            setError('Şifre en az 6 karakter olmalıdır.');
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post(process.env.REACT_APP_API_BASE_URL + '/api/Account/register', {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                userName: formData.userName,
                password: formData.password,
                confirmPassword: formData.confirmPassword,
                userRole: formData.userRole
            });

            console.log('Registration response:', response.data);

            // Successfully registered
            setSuccess('Başarıyla kayıt olundu! 15 saniye içinde giriş sayfasına yönlendirileceksiniz...');

            // The backend returns a string like: "User Registered. Please confirm your account by visiting this URL https://localhost:9001/api/account/confirm-email/?userId=...&code=..."
            // Often, it inserts the Origin (frontend URL) instead of the backend URL.
            const responseText = response.data;
            if (typeof responseText === 'string' && responseText.includes('URL ')) {
                let link = responseText.split('URL ')[1];

                try {
                    const urlObj = new URL(link);
                    urlObj.protocol = 'https:';
                    urlObj.hostname = 'localhost';
                    urlObj.port = '9001';
                    link = urlObj.toString();
                } catch (e) {
                    // Fallback
                    link = link.replace(window.location.origin, process.env.REACT_APP_API_BASE_URL + '');
                }

                setConfirmationLink(link);
            }

            setTimeout(() => {
                navigate('/login');
            }, 15000); // Wait 15 seconds to allow user to click
        } catch (err) {
            console.error('Registration error:', err);

            if (err.response && err.response.data) {
                // Clean architecture template often returns ValidationErrors or specific messages
                if (err.response.data.Message) {
                    setError(err.response.data.Message);
                } else if (err.response.data.Errors && err.response.data.Errors.length > 0) {
                    setError(err.response.data.Errors.join(' ')); // show multiple errors
                } else if (err.response.data.errors) {
                    // FluentValidation format
                    const errorMessages = Object.values(err.response.data.errors).flat().join(' ');
                    setError(errorMessages);
                } else {
                    setError(JSON.stringify(err.response.data));
                }
            } else {
                setError('Kayıt sırasında bir hata oluştu. Lütfen sunucunun çalıştığından emin olun.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <form className={styles.formContainer} onSubmit={handleSubmit}>
                <h2 className={styles.title}>Kayıt Ol</h2>

                {error && <div className={styles.error}>{error}</div>}
                {success && (
                    <div className={styles.success}>
                        {success}
                        {confirmationLink && (
                            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '4px', border: '1px solid #90caf9' }}>
                                <strong>İşlem Gerekli:</strong> Giriş yapabilmeniz için hesabınızı onaylamak üzere aşağıdaki bağlantıya tıklayın.
                                <br />
                                <a href={confirmationLink} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', fontWeight: 'bold', display: 'inline-block', marginTop: '5px' }}>
                                    Hesap Onay Bağlantısı
                                </a>
                            </div>
                        )}
                        {confirmationLink && (
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                style={{ marginTop: '10px', background: 'transparent', border: 'underline', color: '#1b5e20', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                Bağlantıya tıkladım, giriş sayfasına git
                            </button>
                        )}
                    </div>
                )}

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Ad</label>
                    <input
                        type="text"
                        name="firstName"
                        placeholder="Örn: Ahmet"
                        className={styles.input}
                        value={formData.firstName}
                        onChange={handleChange}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Soyad</label>
                    <input
                        type="text"
                        name="lastName"
                        placeholder="Örn: Yılmaz"
                        className={styles.input}
                        value={formData.lastName}
                        onChange={handleChange}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Kullanıcı Adı</label>
                    <input
                        type="text"
                        name="userName"
                        placeholder="Örn: ahmet_y"
                        className={styles.input}
                        value={formData.userName}
                        onChange={handleChange}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>E-posta</label>
                    <input
                        type="email"
                        name="email"
                        placeholder="Örn: ahmetyilmaz@gmail.com"
                        className={styles.input}
                        value={formData.email}
                        onChange={handleChange}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Şifre</label>
                    <input
                        type="password"
                        name="password"
                        placeholder="Güçlü bir şifre oluşturun"
                        className={styles.input}
                        value={formData.password}
                        onChange={handleChange}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Şifre Tekrarı</label>
                    <input
                        type="password"
                        name="confirmPassword"
                        placeholder="Şifrenizi tekrar girin"
                        className={styles.input}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Kullanıcı Rolü</label>
                    <select
                        name="userRole"
                        className={styles.select}
                        value={formData.userRole}
                        onChange={handleChange}
                    >
                        <option value="Basic">İş Arayan (Aday)</option>
                        <option value="HiringManager">İşveren (İşe Alım Yöneticisi)</option>
                    </select>
                </div>

                <button type="submit" className={styles.submitBtn} disabled={loading}>
                    {loading ? 'Kayıt Yapılıyor...' : 'Kayıt Ol'}
                </button>

                <div className={styles.loginLinkContainer}>
                    <span className={styles.loginText}>Zaten kayıtlı mısınız? </span>
                    <span
                        className={styles.loginLink}
                        onClick={() => navigate('/login')}
                    >
                        Giriş yapın!
                    </span>
                </div>
            </form>
        </div>
    );
}

export default Signup;
