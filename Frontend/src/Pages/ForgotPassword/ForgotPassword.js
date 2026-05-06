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
            setStatus({ type: 'error', message: 'Please enter your email address.' });
            return;
        }

        setLoading(true);
        setStatus({ type: '', message: '' });

        try {
            await axios.post(process.env.REACT_APP_API_BASE_URL + '/api/Account/forgot-password', {
                email: email
            });

            setStatus({ 
                type: 'success', 
                message: 'A password reset link has been sent to your email address. (Development: Check the console or Backend logs.)' 
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
                setStatus({ type: 'error', message: 'An error occurred. Make sure your account is registered in the system.' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <form className={styles.formContainer} onSubmit={handleSubmit}>
                <h2 className={styles.title}>Forgot Password</h2>
                <p className={styles.subtitle}>Enter the email address associated with your account, and we'll send you a password reset link.</p>

                {status.message && (
                    <div className={status.type === 'error' ? styles.error : styles.success}>
                        {status.message}
                    </div>
                )}

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Your Email Address</label>
                    <input
                        type="email"
                        placeholder="example@company.com"
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
                        {loading ? 'Sending...' : 'Send Reset Link'}
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

export default ForgotPassword;
