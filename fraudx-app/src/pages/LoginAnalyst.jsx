import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AnimatedBackground from '../components/AnimatedBackground';
import logoImg from '../assets/logo-original.png';
import './Login.css';

export default function LoginAnalyst() {
  const [step, setStep] = useState('credentials'); // credentials, face, mfa, complete
  const [analystId, setAnalystId] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [faceProgress, setFaceProgress] = useState(0);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const { login } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

  const handleCredentials = (e) => {
    e.preventDefault();
    setStep('face');
  };

  useEffect(() => {
    if (step === 'face') {
      // Try to access camera (demo)
      navigator.mediaDevices?.getUserMedia({ video: true })
        .then(stream => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(() => {
          // Camera not available, proceed with demo
        });

      // Simulate face verification progress
      const interval = setInterval(() => {
        setFaceProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setStep('mfa'), 800);
            return 100;
          }
          return prev + 2;
        });
      }, 60);

      return () => {
        clearInterval(interval);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };
    }
  }, [step]);

  const handleMfa = (e) => {
    e.preventDefault();
    setStep('complete');
    setTimeout(() => {
      login('analyst');
      navigate('/dashboard');
    }, 2000);
  };

  return (
    <div className="login">
      <AnimatedBackground />
      <div className="login__card login__card--analyst animate-fade-in-scale">
        <div className="login__header">
          <img src={logoImg} alt="FraudX AI" className="login__logo" />
          <h1 className="login__portal-name">{t('login.analystPortal')}</h1>
        </div>

        {step === 'credentials' && (
          <form className="login__form animate-fade-in" onSubmit={handleCredentials}>
            <div className="input-group">
              <label className="input-label" htmlFor="analyst-id">{t('login.analystId')}</label>
              <input id="analyst-id" className="input" type="text" placeholder="ANL-200001" value={analystId} onChange={e => setAnalystId(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="analyst-pwd">{t('login.password')}</label>
              <input id="analyst-pwd" className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-lg w-full">{t('login.signIn')}</button>
          </form>
        )}

        {step === 'face' && (
          <div className="login__face animate-fade-in">
            <h2 className="login__step-title">{t('login.faceVerification')}</h2>
            <div className="face-frame">
              <video ref={videoRef} autoPlay muted playsInline className="face-frame__video" />
              <div className="face-frame__guide">
                <svg viewBox="0 0 200 200" className="face-frame__oval">
                  <ellipse cx="100" cy="100" rx="65" ry="85" fill="none" stroke="rgba(74, 123, 247, 0.5)" strokeWidth="2" strokeDasharray="6 4"/>
                </svg>
              </div>
              <div className="face-frame__scan" style={{ top: `${faceProgress}%` }} />
              {faceProgress >= 100 && (
                <div className="face-frame__success animate-fade-in-scale">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="22" stroke="#2ECC87" strokeWidth="2"/>
                    <path d="M14 24l7 7 13-13" stroke="#2ECC87" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </div>
            <p className="login__face-status">
              {faceProgress >= 100 ? `✓ ${t('login.faceVerified')}` : faceProgress > 0 ? t('login.verifying') : t('login.positionFace')}
            </p>
            <p className="login__demo-badge">{t('login.demoNotice')}</p>
          </div>
        )}

        {step === 'mfa' && (
          <form className="login__form login__mfa animate-fade-in" onSubmit={handleMfa}>
            <div className="login__step-check">
              <span className="login__check">✓</span>
              <span>{t('login.faceVerified')}</span>
            </div>
            <h2 className="login__step-title">{t('login.mfaTitle')}</h2>
            <p className="text-secondary text-sm">{t('login.mfaDesc')}</p>
            <div className="mfa-inputs">
              {[0,1,2,3,4,5].map(i => (
                <input key={i} className="mfa-input" type="text" maxLength="1" inputMode="numeric"
                  onChange={e => {
                    const val = mfaCode.split('');
                    val[i] = e.target.value;
                    setMfaCode(val.join(''));
                    if (e.target.value && e.target.nextElementSibling) e.target.nextElementSibling.focus();
                  }}
                />
              ))}
            </div>
            <button type="submit" className="btn btn-primary btn-lg w-full">Verify</button>
          </form>
        )}

        {step === 'complete' && (
          <div className="login__complete animate-fade-in">
            <div className="login__step-check"><span className="login__check">✓</span><span>{t('login.identityVerified')}</span></div>
            <div className="login__step-check"><span className="login__check">✓</span><span>{t('login.mfaVerified')}</span></div>
            <div className="login__access-msg">
              <div className="login__access-spinner" />
              <span>{t('login.accessConsole')}</span>
            </div>
          </div>
        )}
      </div>
      <div className="welcome__orb welcome__orb--1" />
      <div className="welcome__orb welcome__orb--2" />
    </div>
  );
}
