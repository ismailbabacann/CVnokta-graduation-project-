import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Mainpage.css';
import heroImage from '../../assets/hero_image.png';

function Mainpage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      question: "How does the system work?",
      answer: "CVs and application forms uploaded to the platform are analyzed with NLP (Natural Language Processing) based algorithms. Then, our AI interview assistant, which can generate dynamic questions suitable for the position, steps in. At the end of the process, your competencies and suitability are presented to the employer as a detailed report."
    },
    {
      question: "How are evaluations made?",
      answer: "Not just with a single overall score! Your suitability for the job (requirement matching), technical/social skills, and communication competence are analyzed multidimensionally with our RAG (Retrieval-Augmented Generation) infrastructure."
    },
    {
      question: "How is a fair and ethical process ensured?",
      answer: "Preventing AI biases is our focus. Personal data such as gender, age, and ethnicity are masked in accordance with data privacy standards. In addition, transparent justification is provided using XAI (Explainable AI) models so that decisions can be grounded."
    }
  ];

  return (
    <div className="mainpage">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">✨ The HR Technology of the Future</div>
          <h1 className="hero-title">
            Discover Your Career <br/><span className="text-gradient">With AI</span>
          </h1>
          <p className="hero-subtitle">
            Leave traditional recruitment processes behind. Highlight your talents with HR AI and find the fastest way to your dream job.
          </p>
          <div className="hero-actions">
            <button className="get-started-btn" onClick={() => navigate('/jobs')}>
              View Jobs
            </button>
            <button className="learn-more-btn" onClick={() => {
              document.getElementById('about').scrollIntoView({ behavior: 'smooth' });
            }}>
              Learn More
            </button>
          </div>
        </div>
        <div className="hero-image-container">
          <div className="bg-glow"></div>
          <div className="image-glass-wrapper">
            <img src={heroImage} alt="Professional getting started" className="hero-image" />
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="trusted-by-section">
        <p className="trusted-by-title">OUR TRUSTED PARTNERS</p>
        <div className="logos-wrapper">
          <div className="logo-item sahibinden">sahibinden.com</div>
          <div className="logo-item trendyol">trendyol</div>
          <div className="logo-item hepsiburada">hepsiburada</div>
          <div className="logo-item hadi">hadi</div>
          <div className="logo-item tombank">Tombank</div>
          <div className="logo-item sunexpress">SunExpress</div>
        </div>
      </section>

      {/* Who We Are (About) Section */}
      <section id="about" className="about-section">
        <div className="about-container">
          <div className="about-text">
            <h2 className="section-title">About Us</h2>
            <h3 className="section-subtitle">AI-Powered Virtual HR Specialist</h3>
            <p className="about-desc">
              We are a next-generation platform developed to overcome deep-rooted problems such as injustice, waste of time, and wrong recruitment that are frequently encountered in internship and recruitment processes.
            </p>
            <p className="about-desc">
              We go beyond traditional scoring and ranking systems! Our goal is to combine CV analysis, AI-supported virtual interviews, and end-to-end explainable reporting under a single roof. We revolutionize human resources by increasing both efficiency and digital transformation capacity.
            </p>
          </div>
          <div className="about-illustration">
            <div className="glass-card">
              <div className="icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg>
              </div>
              <h4>Virtual HR Assistant</h4>
              <p>Fair and fast evaluation with HR AI</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <div className="faq-container">
          <h2 className="section-title text-center">Frequently Asked Questions</h2>
          <p className="faq-subtitle text-center">Everything you wonder about our system</p>
          <div className="faq-list">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className={`faq-item ${openFaq === index ? 'active' : ''}`}
                onClick={() => toggleFaq(index)}
              >
                <div className="faq-question">
                  <h4>{faq.question}</h4>
                  <span className="faq-icon">{openFaq === index ? '−' : '+'}</span>
                </div>
                <div className="faq-answer-wrapper" style={{ maxHeight: openFaq === index ? '200px' : '0' }}>
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}

export default Mainpage;
