import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';

function Login({ setUser }) {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        // Basic validation
        if (!formData.email || !formData.password) {
            setError('Please fill in all required fields.');
            return;
        }

        // Simulate login
        if (formData.email && formData.password) { // Accept any email/password for this demo
            setUser({ email: formData.email });
            navigate('/');
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

                <div className={styles.buttonContainer}>
                    <button type="submit" className={styles.submitBtn}>
                        Login
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
