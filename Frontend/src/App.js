import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Header from './Components/Header/Header.js';
import Footer from './Components/Footer/Footer.js';
import JobView from './Pages/JobView/JobView.js';
import ApplicationForm from './Pages/ApplicationForm/ApplicationForm.js';
import Mainpage from './Pages/Mainpage/Mainpage.js';
import JobList from './Pages/JobList/JobList.js';
import './App.css';

function App() {
  const navigate = useNavigate();
  const [selectedJob, setSelectedJob] = useState(null);

  // Default detailed job info used for JobView
  const defaultDetailedJob = {
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
      'Oturum yönetimi, izleme ve kimlik bilgisi kasası dahil olmak üzere Ayrıcalıklı Erişim Yönetimi (PAM) çözümlerini uygulayın ve yönetin'
    ],
    qualifications: [
      'IDM/IGA çözümlerinin tasarımı, mimarisi, geliştirilmesi ve uygulanmasında kanıtlanmış deneyim',
      'Güçlü analitik ve problem çözme becerileri',
      'Mükemmel iletişim ve kişilerarası beceriler'
    ],
    benefits: [
      { title: '🏠 Esnek Hibrit Çalışma', description: 'Esneklik ve takım bağlılığı arasında doğru dengeyi bulmanıza yardımcı olan bir program' }
    ]
  };

  // Dummy list of jobs for the Job List page mapping the design graphic
  const jobs = [
    {
      id: 1, // Re-routing to the detailed dummy job
      position: 'Web Developer',
      type: 'Full Time',
      location: 'Hyderabad',
      description: 'A Web Developer is a professional who is responsible for the design and construction of websites. They ensure that sites meet user expectations by ensuring they look good, run smoothly and offer easy access points with no loading issues between pages or error messages.'
    },
    {
      id: 2,
      position: 'Data Analyst',
      type: 'Part Time',
      location: 'Mumbai',
      description: 'Data analysts generate reports and present findings to aid decision-making. Specialized tasks include data visualization, statistical analysis, and predictive modeling.'
    },
    {
      id: 3,
      position: 'DevOps Engineer',
      type: 'Full Time',
      location: 'Mumbai',
      description: 'A Dev-Ops engineer is an IT generalist who should have a wide-ranging knowledge of both development and operations, including coding, infrastructure management, system administration, and Dev-Ops tool chains.'
    }
  ];

  const handleApplyClick = () => {
    setSelectedJob(defaultDetailedJob);
    navigate('/apply');
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    navigate('/jobs');
  };

  return (
    <div className="app">
      <Header />
      <main className="main">
        <Routes>
          <Route path="/" element={<Mainpage />} />
          <Route path="/jobs" element={<JobList jobs={jobs} />} />
          <Route path="/jobs/:id" element={<JobView job={defaultDetailedJob} onApply={handleApplyClick} />} />
          <Route path="/apply" element={<ApplicationForm job={defaultDetailedJob} onBack={handleBack} />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
