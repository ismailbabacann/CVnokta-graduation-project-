import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Header from './Components/Header/Header.js';
import Footer from './Components/Footer/Footer.js';
import JobView from './Pages/JobView/JobView.js';
import ApplicationForm from './Pages/ApplicationForm/ApplicationForm.js';
import Mainpage from './Pages/Mainpage/Mainpage.js';
import JobList from './Pages/JobList/JobList.js';
import Login from './Pages/Login/Login.js';
import Signup from './Pages/Signup/Signup.js';
import CompanyLayout from './Pages/CompanyPanel/Layout/CompanyLayout.js';
import CompanyDashboard from './Pages/CompanyPanel/Dashboard/CompanyDashboard.js';
import CompanyJobs from './Pages/CompanyPanel/Jobs/CompanyJobs.js';
import CreateJob from './Pages/CompanyPanel/CreateJob/CreateJob.js';
import CompanyCandidates from './Pages/CompanyPanel/Candidates/CompanyCandidates.js';
import ForgotPassword from './Pages/ForgotPassword/ForgotPassword.js';
import ResetPassword from './Pages/ResetPassword/ResetPassword.js';
import Insights from './Pages/Insights/Insights.js';
import UserLayout from './Pages/UserProfile/Layout/UserLayout.js';
import MyProfile from './Pages/UserProfile/MyProfile/MyProfile.js';
import MyApplications from './Pages/UserProfile/MyApplications/MyApplications.js';
import ProfileJobs from './Pages/UserProfile/Jobs/ProfileJobs.js';
import ProfileJobView from './Pages/UserProfile/Jobs/ProfileJobView.js';
import Help from './Pages/UserProfile/Help/Help.js';
import CompanyHelp from './Pages/CompanyPanel/Help/CompanyHelp.js';
import BestCandidates from './Pages/CompanyPanel/BestCandidates/BestCandidates.js';
import Exam from './Pages/Exam/Exam.js';
import ExamTake from './Pages/Exam/ExamTake.js';
import VideoInterview from './Pages/VideoInterview/VideoInterview.js';
import './App.css';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const token = localStorage.getItem('jwToken');
    const userName = localStorage.getItem('userName');
    if (token) {
      setUser({ userName: userName || 'Kullanıcı' });
    }
  }, []);

  const handleBack = () => {
    navigate('/jobs');
  };

  const isCompanyRoute = location.pathname.startsWith('/company');
  const isProfileRoute = location.pathname.startsWith('/profile');
  const isExamRoute = location.pathname.startsWith('/exam') || location.pathname.startsWith('/exam/take');
  const isInterviewRoute = location.pathname.startsWith('/interview');
  const hideMainHeaderFooter = isCompanyRoute || isProfileRoute || isExamRoute || isInterviewRoute;

  return (
    <div className="app">
      {!hideMainHeaderFooter && <Header user={user} />}
      <main className={hideMainHeaderFooter ? "" : "main"}>
        <Routes>
          <Route path="/" element={<Mainpage />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/signup" element={<Signup setUser={setUser} />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/exam" element={<Exam />} />
          <Route path="/exam/take/:token" element={<ExamTake />} />
          <Route path="/interview/:applicationId" element={<VideoInterview />} />
          <Route path="/jobs" element={<JobList />} />
          <Route path="/jobs/:id" element={<JobView />} />
          <Route path="/apply/:id" element={<ApplicationForm onBack={handleBack} />} />
          <Route path="/company" element={<CompanyLayout />}>
            <Route index element={<CompanyDashboard />} />
            <Route path="jobs" element={<CompanyJobs />} />
            <Route path="create-job" element={<CreateJob />} />
            <Route path="candidates" element={<CompanyCandidates />} />
            <Route path="best-candidates" element={<BestCandidates />} />
            <Route path="help" element={<CompanyHelp />} />
          </Route>
          <Route path="/profile" element={<UserLayout />}>
            <Route index element={<MyProfile />} />
            <Route path="me" element={<MyProfile />} />
            <Route path="applications" element={<MyApplications />} />
            <Route path="jobs" element={<ProfileJobs />} />
            <Route path="jobs/:id" element={<ProfileJobView />} />
            <Route path="help" element={<Help />} />
          </Route>
        </Routes>
      </main>
      {!hideMainHeaderFooter && <Footer />}
    </div>
  );
}

export default App;
