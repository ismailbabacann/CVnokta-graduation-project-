import React, { useState } from 'react';
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
import './App.css';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const handleBack = () => {
    navigate('/jobs');
  };

  const isCompanyRoute = location.pathname.startsWith('/company');

  return (
    <div className="app">
      {!isCompanyRoute && <Header user={user} />}
      <main className={isCompanyRoute ? "" : "main"}>
        <Routes>
          <Route path="/" element={<Mainpage />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/signup" element={<Signup setUser={setUser} />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/jobs" element={<JobList />} />
          <Route path="/jobs/:id" element={<JobView />} />
          <Route path="/apply/:id" element={<ApplicationForm onBack={handleBack} />} />
          <Route path="/company" element={<CompanyLayout />}>
            <Route index element={<CompanyDashboard />} />
            <Route path="jobs" element={<CompanyJobs />} />
            <Route path="create-job" element={<CreateJob />} />
            <Route path="candidates" element={<CompanyCandidates />} />
          </Route>
        </Routes>
      </main>
      {!isCompanyRoute && <Footer />}
    </div>
  );
}

export default App;
