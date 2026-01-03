import React, { useState } from 'react';
import Header from './Components/Header/Header.js';
import Footer from './Components/Footer/Footer.js';
import JobView from './Pages/JobView/JobView.js';
import ApplicationForm from './Pages/ApplicationForm/ApplicationForm.js';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('jobview');
  const [selectedJob, setSelectedJob] = useState(null);

  const job = {
    id: 1,
    position: 'Security Engineer - Identity and Access Management',
    location: 'İstanbul / Maslak',
    type: 'Tam Zamanlı',
    workMode: 'Hibrit',
    department: 'Engineering, Technology & Product – Tech Security',
    aboutCompany: "Trendyol Tech'te misyonumuz, ekosistemimizde olumlu bir etki yaratmak ve ticareti teknoloji aracılığıyla mümkün kılmaktır. Veriler, yaratıcılık ve çeviklik ile karmaşık sorunları çözeriz — her zaman gerçek sonuçlar tarafından yönlendirilir. Öğrenme, işbirliği ve sahiplenme üzerine kurulan bir kültür ile birlikte büyüyoruz.",
    aboutRole: 'Kimlik ve Erişim Yönetimi (IAM) konusunda uzmanlaşmış bir Security Engineer olarak, sistemlerimize ve verilerimize kullanıcı erişimini kontrol eden çözümleri tasarlamak, uygulamak ve sürdürmekten sorumlu olacaksınız. Ana odak noktanız IDM/IGA ve PAM teknolojileri olacak, güvenli ve verimli kullanıcı yaşam döngüsü yönetimi, kimlik doğrulama ve yetkilendirme sağlamak.',
    responsibilities: [
      'IDM/IGA ve PAM çözümleri, mimarileri ve çerçeveleri tasarlayın, geliştirin ve uygulayın',
      'Kullanıcı yaşam döngüsü yönetimi, kimlik doğrulama ve yetkilendirme dahil olmak üzere kimlik ve erişim yönetimi sistemlerini tasarlayın, konuşlandırın ve yönetin',
      'Oturum yönetimi, izleme ve kimlik bilgisi kasası dahil olmak üzere Ayrıcalıklı Erişim Yönetimi (PAM) çözümlerini uygulayın ve yönetin',
      'Sistem yöneticileri ve uygulama sahipleri ile birlikte çalışarak IDM/IGA/PAM çözümlerini entegre edin',
      'OAuth2, OIDC ve SAML protokollerini kullanarak Tek Oturum Açma (SSO) çözümleri uygulayın',
      'Çok faktörlü kimlik doğrulama (MFA) çözümleri uygulayın',
      'Güçlü gizli yönetim çözümlerini konuşlandırın ve yönetin',
      'Ortaya çıkan IDM/IGA/PAM teknolojileri ve endüstri trendleri hakkında güncel kalın',
      'BDDK düzenlemeleri ile uyumluluğu sağlayın'
    ],
    qualifications: [
      'IDM/IGA çözümlerinin tasarımı, mimarisi, geliştirilmesi ve uygulanmasında kanıtlanmış deneyim',
      'IDM/IGA ilkeleri, standartları ve çerçeveleri hakkında güçlü anlayış (örn. SAML, OAuth2, JWT, LDAP, OpenID Connect)',
      'Web erişim yönetimi, dijital imzalar ve sertifika yönetimi konusunda derinlemesine bilgi',
      'Otomasyon için komut dosyası/programlama dil yeterliği (örn. Java, PowerShell, JavaScript, Python)',
      'Bulut ortamlarında IDM/IGA entegrasyonu deneyimi (örn. AWS, Azure)',
      'Gizli yönetim çözümlerini uygulama ve yönetme konusunda uygulamalı deneyim',
      'Güçlü analitik ve problem çözme becerileri',
      'Mükemmel iletişim ve kişilerarası beceriler'
    ],
    benefits: [
      { title: '🏠 Esnek Hibrit Çalışma', description: 'Esneklik ve takım bağlılığı arasında doğru dengeyi bulmanıza yardımcı olan bir program' },
      { title: '💰 Esnek Fayda Bütçesi', description: 'Günlük yemek ödenĞinizi ayarlayın, sağlık sigortası paketinizi seçin' },
      { title: '❤️ Sağlık Desteği', description: 'Konuma dayalı şirket içi doktorlar, psikolog ve diyetisyen desteği' },
      { title: '📚 Eğitim Bütçesi', description: 'Yıllık bütçenizi seçtiğiniz herhangi bir eğitim veya konferans için kullanın' },
      { title: '🌍 Küresel Takım', description: 'Berlin, Amsterdam, Dubai ve daha birçok yerdeki global meslektaşlarımızla işbirliği yapın' },
      { title: '⬆️ Kariyer Büyümesi', description: 'Anlamlı zorluklar alın ve uzman rehberliği desteğiyle büyüyün' }
    ]
  };

  const handleApplyClick = () => {
    setSelectedJob(job);
    setCurrentPage('application');
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setCurrentPage('jobview');
  };

  return (
    <div className="app">
      <Header />
      <main className="main">
        {currentPage === 'jobview' ? (
          <JobView job={job} onApply={handleApplyClick} />
        ) : (
          <ApplicationForm job={job} onBack={handleBack} />
        )}
      </main>
      <Footer />
    </div>
  );
}

export default App;
