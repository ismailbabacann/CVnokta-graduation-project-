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
      question: "What will the system do?",
      answer: "The CVs and application forms you upload to the platform are analyzed with NLP (Natural Language Processing) based algorithms. Then, our AI interview assistant, which can generate dynamic questions suitable for the position, steps in. At the end of the process, your competencies and fit are presented to the employer as a detailed report."
    },
    {
      question: "How are the evaluations made?",
      answer: "Not just with a single overall score! Your job fit (requirement matching), technical/soft skills, and communicative competence are analyzed multi-dimensionally with our RAG (Retrieval-Augmented Generation) infrastructure."
    },
    {
      question: "How is a fair and ethical process ensured?",
      answer: "Preventing AI biases is our focus. Personal data such as gender, age, and ethnicity are masked in accordance with data privacy standards. Additionally, transparent justification is provided using XAI (Explainable AI) models so that decisions can be substantiated."
    }
  ];

  return (
    <div className="mainpage">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Find your job today!</h1>
          <p className="hero-subtitle">
            Start searching for your dream career today and evaluate the best job opportunities.
          </p>
          <button className="get-started-btn" onClick={() => navigate('/jobs')}>
            Get Started
          </button>
        </div>
        <div className="hero-image-container">
          <div className="bg-shape"></div>
          <img src={heroImage} alt="Professional getting started" className="hero-image" />
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="trusted-by-section">
        <p className="trusted-by-title">OUR PARTNERS</p>
        <div className="logos-wrapper">
          <div className="logo-item" style={{ fontFamily: 'sans-serif', fontStyle: 'italic', letterSpacing: '-1px' }}>sahibinden.com</div>
          <div className="logo-item" style={{ fontWeight: '800', color: '#f27a1a' }}>trendyol</div>
          <div className="logo-item" style={{ fontWeight: '800', color: '#ff6000' }}>hepsiburada</div>
          <div className="logo-item" style={{ fontFamily: 'cursive' }}>hadi</div>
          <div className="logo-item" style={{ fontWeight: '700', letterSpacing: '2px' }}>Tombank</div>
          <div className="logo-item" style={{ fontFamily: 'sans-serif', fontWeight: '900', fontStyle: 'italic' }}>SunExpress</div>
        </div>
      </section>

      {/* Who We Are (About) Section */}
      <section id="about" className="about-section">
        <div className="about-container">
          <div className="about-text">
            <h2 className="section-title">About Us</h2>
            <h3 className="section-subtitle">AI-Powered Virtual HR Specialist</h3>
            <p>
              We are a next-generation platform developed to overcome deep-rooted problems such as unfairness, time loss, and mis-hires frequently seen in internship and recruitment processes.
            </p>
            <p>
              We go beyond traditional scoring and ranking systems! Our goal is to combine CV analysis, AI-powered virtual interviews, and end-to-end explainable reporting under a single roof. We are increasing both efficiency and digital transformation capacity by revolutionizing human resources.
            </p>
          </div>
          <div className="about-illustration">
            <div className="placeholder-illustration">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#764ba2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bot"><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg>
              <p>Virtual HR Assistant</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <div className="faq-container">
          <h2 className="section-title text-center">Frequently Asked Questions</h2>
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
                {openFaq === index && (
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}

export default Mainpage;
