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
            setStatus({ type: 'error', message: 'Invalid or missing reset link. Please click the link in your email again.' });
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
            setStatus({ type: 'error', message: 'Please fill in all fields.' });
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setStatus({ type: 'error', message: 'Passwords do not match.' });
            return;
        }

        if (formData.password.length < 6) {
            setStatus({ type: 'error', message: 'Password must be at least 6 characters.' });
            return;
        }

        setLoading(true);
        setStatus({ type: '', message: '' });

        try {
            await axios.post(process.env.REACT_APP_API_BASE_URL + '/api/Account/reset-password', {
                email: formData.email,
                token: formData.token,
                password: formData.password,
                confirmPassword: formData.confirmPassword
            });

            setStatus({ 
                type: 'success', 
                message: 'Your password has been successfully updated! Redirecting to the login page...' 
            });
            
            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (err) {
            console.error('Reset password error:', err);
            if (err.response && err.response.data && err.response.data.message) {
                setStatus({ type: 'error', message: err.response.data.message });
            } else {
                setStatus({ type: 'error', message: 'An error occurred while resetting the password. Your link may have expired.' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <form className={styles.formContainer} onSubmit={handleSubmit}>
                <h2 className={styles.title}>Set New Password</h2>
                <p className={styles.subtitle}>Please enter a secure new password with at least 6 characters.</p>

                {status.message && (
                    <div className={status.type === 'error' ? styles.error : styles.success}>
                        {status.message}
                    </div>
                )}

                <div className={styles.inputGroup}>
                    <label className={styles.label}>New Password</label>
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
                    <label className={styles.label}>New Password (Again)</label>
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
                        {loading ? 'Updating...' : 'Reset My Password'}
                    </button>
                    <button 
                        type="button" 
                        className={styles.backBtn}
                        onClick={() => navigate('/login')}
                    >
                        Back to Login
                    </button>
                </div>
            </form>
        </div>
    );
}

export default ResetPassword;
