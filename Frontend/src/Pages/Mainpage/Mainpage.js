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
      question: "Sistem nasıl çalışır?",
      answer: "Platforma yüklediğiniz CV'ler ve başvuru formları NLP (Doğal Dil İşleme) tabanlı algoritmalarla analiz edilir. Ardından, pozisyona uygun dinamik sorular üretebilen AI mülakat asistanımız devreye girer. Sürecin sonunda yetkinlikleriniz ve uygunluğunuz detaylı bir rapor olarak işverene sunulur."
    },
    {
      question: "Değerlendirmeler nasıl yapılıyor?",
      answer: "Sadece tek bir genel puanla değil! İşe uygunluğunuz (gereksinim eşleştirme), teknik/sosyal becerileriniz ve iletişim yetkinliğiniz RAG (Retrieval-Augmented Generation) altyapımız ile çok boyutlu olarak analiz edilir."
    },
    {
      question: "Adil ve etik bir süreç nasıl sağlanıyor?",
      answer: "Yapay zeka önyargılarını önlemek odak noktamızdır. Cinsiyet, yaş ve etnik köken gibi kişisel veriler veri gizliliği standartlarına uygun olarak maskelenir. Ayrıca kararların temellendirilebilmesi için XAI (Açıklanabilir Yapay Zeka) modelleri kullanılarak şeffaf gerekçelendirme sunulur."
    }
  ];

  return (
    <div className="mainpage">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">✨ Geleceğin İK Teknolojisi</div>
          <h1 className="hero-title">
            Yapay Zeka ile <br/><span className="text-gradient">Kariyerinizi Keşfedin</span>
          </h1>
          <p className="hero-subtitle">
            Geleneksel işe alım süreçlerini geride bırakın. hr.ai ile yeteneklerinizi öne çıkarın ve hayalinizdeki işe giden en hızlı yolu bulun.
          </p>
          <div className="hero-actions">
            <button className="get-started-btn" onClick={() => navigate('/jobs')}>
              İlanları İncele
            </button>
            <button className="learn-more-btn" onClick={() => {
              document.getElementById('about').scrollIntoView({ behavior: 'smooth' });
            }}>
              Daha Fazla Bilgi
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
        <p className="trusted-by-title">GÜVENİLEN PARTNERLERİMİZ</p>
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
            <h2 className="section-title">Hakkımızda</h2>
            <h3 className="section-subtitle">Yapay Zeka Destekli Sanal İK Uzmanı</h3>
            <p className="about-desc">
              Staj ve işe alım süreçlerinde sıkça karşılaşılan adaletsizlik, zaman kaybı ve yanlış işe alım gibi köklü sorunları aşmak için geliştirilmiş yeni nesil bir platformuz.
            </p>
            <p className="about-desc">
              Geleneksel puanlama ve sıralama sistemlerinin ötesine geçiyoruz! Hedefimiz CV analizi, yapay zeka destekli sanal mülakatlar ve uçtan uca açıklanabilir raporlamayı tek bir çatı altında birleştirmektir. İnsan kaynaklarında devrim yaratarak hem verimliliği hem de dijital dönüşüm kapasitesini artırıyoruz.
            </p>
          </div>
          <div className="about-illustration">
            <div className="glass-card">
              <div className="icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg>
              </div>
              <h4>Sanal İK Asistanı</h4>
              <p>hr.ai ile adil ve hızlı değerlendirme</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <div className="faq-container">
          <h2 className="section-title text-center">Sıkça Sorulan Sorular</h2>
          <p className="faq-subtitle text-center">Sistemimiz hakkında merak ettiğiniz her şey</p>
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
