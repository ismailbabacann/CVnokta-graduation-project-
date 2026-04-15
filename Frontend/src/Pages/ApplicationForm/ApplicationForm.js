import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import '../ApplicationForm/ApplicationForm.css';

// Set up the worker for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

function ApplicationForm({ onBack }) {
  const { id } = useParams();
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
    cvUrl: '',
    cvOriginalName: '',
    coverLetter: '',
    futureContact: true,
  });

  useEffect(() => {
    // Load Cloudinary Upload Widget Script
    const scriptId = 'cloudinary-widget-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://upload-widget.cloudinary.com/global/all.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

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
    if (!formData.cvUrl) err.resume = 'CV yüklemesi zorunludur';

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

  const handleCloudinaryUpload = () => {
    if (!window.cloudinary) {
      console.error("Cloudinary script henüz yüklenmedi.");
      return;
    }

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: 'dizjdaqgr',
        uploadPreset: 'cv_uploads',
        multiple: false,
        resourceType: 'auto',
        clientAllowedFormats: ['pdf', 'doc', 'docx'],
      },
      (error, result) => {
        if (!error && result && result.event === "success") {
          const url = result.info.secure_url;
          const originalName = result.info.original_filename + '.' + result.info.format;

          setFormData(prev => ({
            ...prev,
            cvUrl: url,
            cvOriginalName: originalName
          }));

          if (errors.resume) {
            setErrors(prev => ({ ...prev, resume: '' }));
          }

          if (result.info.format === 'pdf') {
            parsePdfFromUrl(url);
          }
        }
      }
    );
    widget.open();
  };

  const parsePdfFromUrl = async (pdfUrl) => {
    try {
      setIsParsing(true);
      // Cloudinary URL'sindeki PDF'i okuyoruz
      const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
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
      const locationRegex = /(İstanbul|Ankara|İzmir|Bursa|Antalya|Adana|Konya|Kocaeli|Kayseri|Mersin|Eskişehir|Samsun|Denizli|Sakarya|Gaziantep|Trabzon)/i;

      const emailMatch = text.match(emailRegex);
      const phoneMatch = text.match(phoneRegex);
      const linkedinMatch = text.match(linkedinRegex);
      const locationMatch = text.match(locationRegex);

      const words = text.trim().split(/\s+/);
      let guessedName = '';
      if (words.length >= 2) {
        guessedName = words[0] + ' ' + words[1];
        if (words.length > 2 && /^[A-ZÇĞİÖŞÜ][a-zçğıöşü]+$/.test(words[2])) {
          guessedName += ' ' + words[2];
        }
      }

      setFormData(prev => ({
        ...prev,
        fullName: prev.fullName || guessedName,
        email: prev.email || (emailMatch ? emailMatch[1] : ''),
        phone: prev.phone || (phoneMatch ? phoneMatch[0] : ''),
        linkedIn: prev.linkedIn || (linkedinMatch ? `https://linkedin.com/in/${linkedinMatch[1]}` : ''),
        currentLocation: prev.currentLocation || (locationMatch ? locationMatch[0] : '')
      }));
      
      alert("CV'niz başarıyla tarandı ve bazı alanlar (Ad Soyad, Email, Telefon, vs.) otomatik dolduruldu!");
    } catch (err) {
      console.error('PDF form doldurma hatası:', err);
    } finally {
      setIsParsing(false);
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
        coverLetter: formData.coverLetter,
        cvUrl: formData.cvUrl
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

        <div className="form-group">
          <label>CV/Özgeçmiş <span className="required">*</span></label>
          <button
            type="button"
            className="btn file-input-label"
            onClick={handleCloudinaryUpload}
            style={{ width: '100%', padding: '10px', textAlign: 'center', cursor: 'pointer', background: '#f8f9fa', border: '1px dashed #ccc' }}
          >
            <span></span> {formData.cvOriginalName ? `📄 ${formData.cvOriginalName} (Değiştir)` : '☁️ Cloudinary ile CV Yüklemek İçin Tıklayın'}
          </button>
          {errors.resume && <span className="error-message">{errors.resume}</span>}
        </div>

        <div className="form-group">
          <label>Ön Yazı / Cover Letter</label>
          <textarea name="coverLetter" value={formData.coverLetter} onChange={handleChange} placeholder="Kendinizden ve bu pozisyon için hedeflerinizden kısaca bahsedin..." />
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
