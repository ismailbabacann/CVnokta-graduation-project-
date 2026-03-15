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
            setError('Please fill in all required fields.');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post('https://localhost:9001/api/Account/register', {
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
            setSuccess('Successfully signed up! Redirecting to login in 15 seconds...');

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
                    link = link.replace(window.location.origin, 'https://localhost:9001');
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
                setError('An error occurred during registration. Please check if the backend is running.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <form className={styles.formContainer} onSubmit={handleSubmit}>
                <h2 className={styles.title}>Register</h2>

                {error && <div className={styles.error}>{error}</div>}
                {success && (
                    <div className={styles.success}>
                        {success}
                        {confirmationLink && (
                            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '4px', border: '1px solid #90caf9' }}>
                                <strong>Action Required:</strong> Please click the link below to confirm your account so you can login.
                                <br />
                                <a href={confirmationLink} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', fontWeight: 'bold', display: 'inline-block', marginTop: '5px' }}>
                                    Confirm Account Link
                                </a>
                            </div>
                        )}
                        {confirmationLink && (
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                style={{ marginTop: '10px', background: 'transparent', border: 'underline', color: '#1b5e20', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                I have clicked the link, take me to Login now
                            </button>
                        )}
                    </div>
                )}

                <div className={styles.inputGroup}>
                    <label className={styles.label}>First Name</label>
                    <input
                        type="text"
                        name="firstName"
                        placeholder="Ex: Abhishek"
                        className={styles.input}
                        value={formData.firstName}
                        onChange={handleChange}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Last Name</label>
                    <input
                        type="text"
                        name="lastName"
                        placeholder="Ex: Sharma"
                        className={styles.input}
                        value={formData.lastName}
                        onChange={handleChange}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Username</label>
                    <input
                        type="text"
                        name="userName"
                        placeholder="Ex: abhishek_s"
                        className={styles.input}
                        value={formData.userName}
                        onChange={handleChange}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Email</label>
                    <input
                        type="email"
                        name="email"
                        placeholder="Ex: abhisheksharma@gmail.com"
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
                        placeholder="Create strong password"
                        className={styles.input}
                        value={formData.password}
                        onChange={handleChange}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Confirm Password</label>
                    <input
                        type="password"
                        name="confirmPassword"
                        placeholder="Confirm your password"
                        className={styles.input}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>User Role</label>
                    <select
                        name="userRole"
                        className={styles.select}
                        value={formData.userRole}
                        onChange={handleChange}
                    >
                        <option value="Basic">Job Seeker (Basic)</option>
                        <option value="HiringManager">Employer (HiringManager)</option>
                    </select>
                </div>

                <button type="submit" className={styles.submitBtn} disabled={loading}>
                    {loading ? 'Registering...' : 'Register'}
                </button>

                <div className={styles.loginLinkContainer}>
                    <span className={styles.loginText}>Already registered? </span>
                    <span
                        className={styles.loginLink}
                        onClick={() => navigate('/login')}
                    >
                        Login here!
                    </span>
                </div>
            </form>
        </div>
    );
}

export default Signup;
