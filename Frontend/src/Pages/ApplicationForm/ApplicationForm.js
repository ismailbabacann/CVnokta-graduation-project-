import React, { useState } from 'react';
import '../ApplicationForm/ApplicationForm.css';

function ApplicationForm({ job, onBack }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    linkedIn: '',
    currentLocation: '',
    currentCompany: '',
    resume: null,
    coverLetter: '',
    futureContact: true,
  });

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const validate = () => {
    const err = {};
    if (!formData.fullName.trim()) err.fullName = 'Ad Soyad zorunludur';
    if (!formData.email.trim()) err.email = 'Email zorunludur';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) err.email = 'Geçerli email girin';
    if (!formData.phone.trim()) err.phone = 'Telefon zorunludur';
    if (!formData.linkedIn.trim()) err.linkedIn = 'LinkedIn zorunludur';
    if (!formData.currentLocation.trim()) err.currentLocation = 'Konum zorunludur';
    if (!formData.resume) err.resume = 'CV yüklemesi zorunludur';

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData(prev => ({ ...prev, resume: file }));
    if (errors.resume) {
      setErrors(prev => ({ ...prev, resume: '' }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    console.log('Başvuru:', formData);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="form-container">
        <div className="success-message">
          <h2>✅ Başvurunuz Alındı!</h2>
          <p><strong>{job.position}</strong> pozisyonuna başvurunuz başarıyla iletildi.</p>
          <button className="btn" onClick={onBack}>
            ← Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>İş Başvurusu</h1>
        <p>{job.position}</p>
        <p className="location">📍 {job.location}</p>
      </div>

      <form className="form-body" onSubmit={handleSubmit}>
        <FormField label="Ad Soyad" name="fullName" value={formData.fullName} onChange={handleChange} error={errors.fullName} required />
        <FormField label="Email" name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} required />
        <FormField label="Telefon" name="phone" type="tel" value={formData.phone} onChange={handleChange} error={errors.phone} required />
        <FormField label="Bulunduğunuz Yer" name="currentLocation" value={formData.currentLocation} onChange={handleChange} error={errors.currentLocation} required />
        <FormField label="LinkedIn" name="linkedIn" type="url" value={formData.linkedIn} onChange={handleChange} error={errors.linkedIn} required />
        <FormField label="Mevcut Şirket" name="currentCompany" value={formData.currentCompany} onChange={handleChange} />

        <div className="form-group">
          <label>CV/Özgeçmiş <span className="required">*</span></label>
          <input type="file" id="resume" className="file-input" onChange={handleFileChange} accept=".pdf,.doc,.docx" />
          <label htmlFor="resume" className="file-input-label">
            <span>📄</span> {formData.resume ? formData.resume.name : 'CV yüklemek için tıklayın'}
          </label>
          {errors.resume && <span className="error-message">{errors.resume}</span>}
        </div>

        <div className="form-group">
          <label>Mesaj</label>
          <textarea name="coverLetter" value={formData.coverLetter} onChange={handleChange} placeholder="Kendinizden bahsedin..." />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-back" onClick={onBack}>← Geri Dön</button>
          <button type="submit" className="btn btn-submit">✓ Başvuruyu Gönder</button>
        </div>
      </form>
    </div>
  );
}

function FormField({ label, name, type = 'text', value, onChange, error, required = false }) {
  return (
    <div className="form-group">
      <label>
        {label}
        {required && <span className="required">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className={error ? 'error' : ''}
      />
      {error && <span className="error-message">{error}</span>}
    </div>
  );
}

export default ApplicationForm;
