import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimatedBackground from '../components/AnimatedBackground';
import logoImg from '../assets/logo-original.png';
import { useTheme } from '../context/ThemeContext';
import './Welcome.css';

export default function Welcome() {
  const [phase, setPhase] = useState(0); // 0=logo, 1=tagline, 2=ready
  const navigate = useNavigate();
  const { t } = useTheme();

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 800);
    const t2 = setTimeout(() => setPhase(2), 2000);
    const t3 = setTimeout(() => navigate('/select-role'), 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [navigate]);

  return (
    <div className="welcome">
      <AnimatedBackground />
      <div className="welcome__content">
        <div className={`welcome__logo ${phase >= 0 ? 'welcome__logo--visible' : ''}`}>
          <img src={logoImg} alt="FraudX AI" className="welcome__logo-img" />
        </div>
        <div className={`welcome__text ${phase >= 1 ? 'welcome__text--visible' : ''}`}>
          <h1 className="welcome__title">{t('welcome.tagline')}</h1>
          <p className="welcome__subtitle">{t('welcome.subtitle')}</p>
        </div>
        <div className={`welcome__loader ${phase >= 2 ? 'welcome__loader--visible' : ''}`}>
          <div className="welcome__progress" />
        </div>
      </div>
      {/* Decorative elements */}
      <div className="welcome__orb welcome__orb--1" />
      <div className="welcome__orb welcome__orb--2" />
      <div className="welcome__orb welcome__orb--3" />
    </div>
  );
}
