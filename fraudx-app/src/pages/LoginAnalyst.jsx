import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AnimatedBackground from '../components/AnimatedBackground';
import MFAVerification from '../components/MFA/MFAVerification';
import logoImg from '../assets/logo-original.png';
import './Login.css';

const DEMO_MFA_CODE = '482901';

export default function LoginAnalyst() {
  const [step, setStep] = useState('credentials'); // credentials, face, mfa, complete
  const [analystId, setAnalystId] = useState('');
  const [password, setPassword] = useState('');
  const [faceProgress, setFaceProgress] = useState(0);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const { login } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

  const handleCredentials = (e) => {
    e.preventDefault();
    setError('');
    if (!analystId.trim() || !password.trim()) {
      setError('Please enter your Analyst ID and password.');
      return;
    }
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

  const handleMfaSuccess = () => {
    setStep('complete');
    setTimeout(() => {
      login('analyst');
      navigate('/dashboard');
    }, 1200);
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
              <input id="analyst-id" className="input" type="text" placeholder="ANL-200001" value={analystId} onChange={e => { setAnalystId(e.target.value); setError(''); }} />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="analyst-pwd">{t('login.password')}</label>
              <input id="analyst-pwd" className="input" type="password" placeholder="••••••••" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} />
            </div>
            {error && (
              <div style={{ color: 'var(--risk-high, #EF4444)', fontSize: 'var(--font-size-xs)', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--border-radius-md)', textAlign: 'center' }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-lg w-full">{t('login.signIn')}</button>
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <span className="text-xs text-tertiary" style={{ fontFamily: 'var(--font-mono)' }}>
                Demo — ID: ANL-200001 | Password: fraudx2024
              </span>
            </div>
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
            <div className="login__demo-badge" style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', padding: '8px 16px', background: 'rgba(74, 123, 247, 0.1)', borderRadius: 'var(--border-radius-md)', marginTop: 8 }}>
              <span style={{ fontSize: '1rem' }}>🔬</span>
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--brand-blue, #4A7BF7)' }}>DEMO VERIFICATION</span>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}> — Simulated biometric check</span>
            </div>
          </div>
        )}

        {step === 'mfa' && (
          <div>
            <div className="login__step-check" style={{ marginBottom: 16, justifyContent: 'center' }}>
              <span className="login__check">✓</span>
              <span>{t('login.faceVerified')}</span>
            </div>
            <MFAVerification
              demoCode={DEMO_MFA_CODE}
              roleName="Analyst"
              onSuccess={handleMfaSuccess}
              onCancel={() => setStep('credentials')}
            />
          </div>
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
