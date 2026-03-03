import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Signup.module.css';

function Signup({ setUser }) {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        gender: '',
        address: '',
        userType: 'Job Seeker'
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

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
        setSuccess('');

        // Basic validation
        if (!formData.fullName || !formData.email || !formData.password || !formData.gender || !formData.address) {
            setError('Please fill in all required fields.');
            return;
        }

        // Simulate successful registration
        setSuccess('Successfully signed up!');

        // Optionally log them in immediately or redirect after a delay
        setTimeout(() => {
            // setUser(formData); // Uncomment to auto-login
            navigate('/login');
        }, 1500);
    };

    return (
        <div className={styles.container}>
            <form className={styles.formContainer} onSubmit={handleSubmit}>
                <h2 className={styles.title}>Register</h2>

                {error && <div className={styles.error}>{error}</div>}
                {success && <div className={styles.success}>{success}</div>}

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Full Name</label>
                    <input
                        type="text"
                        name="fullName"
                        placeholder="Ex: Abhishek Sharma"
                        className={styles.input}
                        value={formData.fullName}
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

                <div className={styles.radioGroupWrapper}>
                    <label className={styles.label}>Gender</label>
                    <div className={styles.radioGroup}>
                        <label className={styles.radioLabel}>
                            <input
                                type="radio"
                                name="gender"
                                value="Male"
                                checked={formData.gender === 'Male'}
                                onChange={handleChange}
                                className={styles.radioInput}
                            />
                            Male
                        </label>
                        <label className={styles.radioLabel}>
                            <input
                                type="radio"
                                name="gender"
                                value="Female"
                                checked={formData.gender === 'Female'}
                                onChange={handleChange}
                                className={styles.radioInput}
                            />
                            Female
                        </label>
                    </div>
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Address</label>
                    <input
                        type="text"
                        name="address"
                        placeholder="Ex: A70, Down-Town Street, Mumbai"
                        className={styles.input}
                        value={formData.address}
                        onChange={handleChange}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>User Type</label>
                    <select
                        name="userType"
                        className={styles.select}
                        value={formData.userType}
                        onChange={handleChange}
                    >
                        <option value="Job Seeker">Job Seeker</option>
                        <option value="Employer">Employer</option>
                    </select>
                </div>

                <button type="submit" className={styles.submitBtn}>
                    Register
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
