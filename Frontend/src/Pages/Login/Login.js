import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './Login.module.css';

function Login({ setUser }) {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
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

        // Basic validation
        if (!formData.email || !formData.password) {
            setError('Please fill in all required fields.');
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post('https://localhost:9001/api/Account/authenticate', {
                email: formData.email,
                password: formData.password
            });

            if (response.data && response.data.jwToken) {
                // Save token
                localStorage.setItem('jwToken', response.data.jwToken);
                if (response.data.refreshToken) {
                    localStorage.setItem('refreshToken', response.data.refreshToken);
                }
                if (response.data.userName) {
                    localStorage.setItem('userName', response.data.userName);
                }

                // Update user state
                setUser({
                    email: formData.email,
                    userName: response.data.userName,
                    roles: response.data.roles
                });

                // Role-based redirection
                if (response.data.roles && response.data.roles.includes('HiringManager')) {
                    navigate('/company');
                } else {
                    navigate('/');
                }
            } else {
                setError('Login failed. Please try again.');
            }
        } catch (err) {
            console.error('Login error:', err);
            if (err.response && err.response.data && err.response.data.message) {
                setError(err.response.data.message);
            } else if (err.response && err.response.status === 401) {
                setError('Invalid email or password.');
            } else {
                setError('An error occurred during login. Please ensure the backend is running.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <form className={styles.formContainer} onSubmit={handleSubmit}>
                <h2 className={styles.title}>Login</h2>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Email</label>
                    <input
                        type="email"
                        name="email"
                        placeholder="employer@gmail.com"
                        className={styles.input}
                        value={formData.email}
                        onChange={handleChange}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Password</label>
                    <input
                        type="password"
                        name="password"
                        placeholder="****"
                        className={styles.input}
                        value={formData.password}
                        onChange={handleChange}
                    />
                </div>

                <div className={styles.forgotPasswordContainer}>
                    <span 
                        className={styles.forgotPasswordLink}
                        onClick={() => navigate('/forgot-password')}
                    >
                        Şifremi Unuttum?
                    </span>
                </div>

                <div className={styles.buttonContainer}>
                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                    </button>
                </div>

                <div className={styles.registerLinkContainer}>
                    <span className={styles.registerText}>New user? </span>
                    <span
                        className={styles.registerLink}
                        onClick={() => navigate('/signup')}
                    >
                        Register here!
                    </span>
                </div>
            </form>
        </div>
    );
}

export default Login;
