import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Mainpage.css';
import heroImage from '../../assets/hero_image.png';

function Mainpage() {
  const navigate = useNavigate();

  return (
    <div className="mainpage">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Find your job today!</h1>
          <p className="hero-subtitle">
            Hayalinizdeki kariyeri bulmak için hemen aramaya başlayın ve en uygun iş fırsatlarını değerlendirin.
          </p>
          <button className="get-started-btn" onClick={() => navigate('/jobs')}>
            Get Started
          </button>
        </div>
        <div className="hero-image-container">
          <div className="bg-shape"></div>

          <img src={heroImage} alt="Professional getting started" className="hero-image" />
        </div>
      </div>
    </div>
  );
}

export default Mainpage;
