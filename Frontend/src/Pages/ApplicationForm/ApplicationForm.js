import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import '../ApplicationForm/ApplicationForm.css';

// Set up the worker for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

function ApplicationForm({ onBack }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);

  useEffect(() => {
    if (id) {
      axios.get(`https://localhost:9001/api/v1/JobPostings/public/${id}`)
        .then(res => setJob(res.data.data || res.data))
        .catch(err => console.error("Error fetching job for application form:", err));
    }
  }, [id]);
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [submitError, setSubmitError] = useState(null);

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

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFormData(prev => ({ ...prev, resume: file }));
    if (errors.resume) {
      setErrors(prev => ({ ...prev, resume: '' }));
    }

    if (file.type === 'application/pdf') {
      try {
        setIsParsing(true);
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map(item => item.str);
          text += strings.join(' ') + ' ';
        }

        const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
        const phoneRegex = /(?:\+90|0)?[-\s]?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{2}[-\s]?\d{2}/;
        const linkedinRegex = /linkedin\.com\/in\/([a-zA-Z0-9-]+)/i;

        const emailMatch = text.match(emailRegex);
        const phoneMatch = text.match(phoneRegex);
        const linkedinMatch = text.match(linkedinRegex);

        // Heuristic for name: usually the first 2-3 words of a CV
        // We clean up extra spaces and take the first 2 words as a guess
        const words = text.trim().split(/\s+/);
        let guessedName = '';
        if (words.length >= 2) {
          guessedName = words[0] + ' ' + words[1];
          if (words.length > 2 && /^[A-ZÇĞİÖŞÜ][a-zçğıöşü]+$/.test(words[2])) {
            // if 3rd word looks like a capitalized name, include it (e.g. 2 names + 1 surname)
            guessedName += ' ' + words[2];
          }
        }

        setFormData(prev => ({
          ...prev,
          fullName: prev.fullName || guessedName,
          email: prev.email || (emailMatch ? emailMatch[1] : ''),
          phone: prev.phone || (phoneMatch ? phoneMatch[0] : ''),
          linkedIn: prev.linkedIn || (linkedinMatch ? `https://linkedin.com/in/${linkedinMatch[1]}` : '')
        }));
      } catch (err) {
        console.error('PDF Parsing error:', err);
      } finally {
        setIsParsing(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        jobPostingId: id,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        location: formData.currentLocation,
        linkedInProfile: formData.linkedIn,
        currentCompany: formData.currentCompany,
        coverLetter: formData.coverLetter,
        cvUrl: "uploaded_cvs/" + formData.resume.name
      };

      const response = await axios.post('https://localhost:9001/api/v1/Applications/public/apply', payload);
      if (response.data.success || response.status === 200) {
        setSubmitted(true);
      }
    } catch (err) {
      console.error('Başvuru gönderilemedi:', err);
      setSubmitError(err.response?.data?.message || 'Başvuru sırasında bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="form-container">
        <div className="success-message">
          <h2>✅ Başvurunuz Alındı!</h2>
          <p><strong>{job?.jobTitle || 'Bu'}</strong> pozisyonuna başvurunuz başarıyla iletildi.</p>
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
        <p>{job?.jobTitle || 'Yükleniyor...'}</p>
        <p className="location">📍 {job?.location || ''}</p>
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

        {submitError && <div className="error-message" style={{ marginBottom: '10px' }}>{submitError}</div>}

        <div className="form-actions">
          <button type="button" className="btn btn-back" disabled={isSubmitting} onClick={onBack}>← Geri Dön</button>
          <button type="submit" className="btn btn-submit" disabled={isSubmitting || isParsing}>
            {isSubmitting ? 'Gönderiliyor...' : '✓ Başvuruyu Gönder'}
          </button>
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
