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
  const [tab, setTab] = useState('signin'); // 'signin' or 'signup'
  const [step, setStep] = useState('credentials'); // credentials, face, mfa, complete
  
  // Sign In state
  const [analystId, setAnalystId] = useState('');
  const [password, setPassword] = useState('');
  const [faceProgress, setFaceProgress] = useState(0);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Registration state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regOrg, setRegOrg] = useState('FraudX AI Security Division');
  const [regAnalystId, setRegAnalystId] = useState('');
  const [regDesignation, setRegDesignation] = useState('Financial Crime Analyst');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regCity, setRegCity] = useState('');
  const [signUpError, setSignUpError] = useState('');
  const [signUpSuccess, setSignUpSuccess] = useState(null);

  const { authenticate, registerAnalyst } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

  const handleCredentials = (e) => {
    e.preventDefault();
    setError('');

    if (!analystId.trim() || !password.trim()) {
      setError('Please enter your Analyst ID and password.');
      return;
    }

    // Verify credentials first
    const authResult = authenticate('analyst', { identifier: analystId, password });
    if (!authResult.success) {
      setError(authResult.error || 'Invalid analyst credentials.');
      return;
    }

    setStep('face');
  };

  const handleAnalystRegister = (e) => {
    e.preventDefault();
    setSignUpError('');
    setSignUpSuccess(null);

    if (!regFullName.trim() || !regEmail.trim() || !regPassword.trim() || !regAnalystId.trim()) {
      setSignUpError('Please fill in Full Name, Official Email, Analyst/Employee ID, and Password.');
      return;
    }

    if (!regEmail.includes('@')) {
      setSignUpError('Please enter a valid professional email.');
      return;
    }

    if (regPassword.length < 6) {
      setSignUpError('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setSignUpError('Passwords do not match.');
      return;
    }

    const regRes = registerAnalyst({
      fullName: regFullName,
      email: regEmail,
      phone: regPhone,
      organisation: regOrg,
      analystId: regAnalystId,
      designation: regDesignation,
      city: regCity,
      password: regPassword,
    });

    if (regRes.success) {
      setSignUpSuccess({
        id: regRes.user.id,
        name: regRes.user.name,
        email: regRes.user.email,
        org: regRes.user.organisation,
      });
      setAnalystId(regRes.user.id);
      setPassword(regPassword);
    }
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
      navigate('/dashboard');
    }, 1200);
  };

  return (
    <div className="login">
      <AnimatedBackground />
      <div className="login__card login__card--analyst animate-fade-in-scale" style={{ maxWidth: tab === 'signup' ? 520 : 460 }}>
        <div className="login__header">
          <img src={logoImg} alt="FraudX AI" className="login__logo" />
          <h1 className="login__portal-name">{t('login.analystPortal')}</h1>
        </div>

        {step === 'credentials' && (
          <div className="login__tabs">
            <button
              type="button"
              className={`login__tab ${tab === 'signin' ? 'login__tab--active' : ''}`}
              onClick={() => { setTab('signin'); setError(''); }}
            >
              Analyst Sign In
            </button>
            <button
              type="button"
              className={`login__tab ${tab === 'signup' ? 'login__tab--active' : ''}`}
              onClick={() => { setTab('signup'); setSignUpError(''); setSignUpSuccess(null); }}
            >
              Enrol / Request Clearance
            </button>
          </div>
        )}

        {step === 'credentials' && tab === 'signin' && (
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
              <div style={{ color: 'var(--risk-high, #EF4444)', fontSize: 'var(--font-size-xs)', padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--border-radius-md)', textAlign: 'center', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-lg w-full">{t('login.signIn')}</button>
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <span className="text-xs text-tertiary" style={{ fontFamily: 'var(--font-mono)' }}>
                Registered Demo — ID: ANL-200001 | Password: fraudx2024
              </span>
            </div>
          </form>
        )}

        {step === 'credentials' && tab === 'signup' && (
          <form className="login__form animate-fade-in" onSubmit={handleAnalystRegister}>
            {signUpSuccess ? (
              <div style={{ padding: '16px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 'var(--border-radius-lg)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🛡️</div>
                <h3 style={{ margin: '0 0 6px', color: 'var(--risk-low, #22C55E)', fontSize: '1.1rem' }}>Analyst Clearance Registered!</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>
                  Credentials logged for <strong>{signUpSuccess.name}</strong> ({signUpSuccess.id}) under <em>{signUpSuccess.org}</em>.
                </p>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 6, marginBottom: 16 }}>
                  📋 Level-2 clearance enabled for local session. You may now proceed to Analyst Sign In.
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-md w-full"
                  onClick={() => { setTab('signin'); setSignUpSuccess(null); }}
                >
                  Proceed to Sign In
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group">
                    <label className="input-label">Full Name *</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="e.g. Anand V"
                      value={regFullName}
                      onChange={e => setRegFullName(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Official Email *</label>
                    <input
                      className="input"
                      type="email"
                      placeholder="anand@fraudx.ai"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group">
                    <label className="input-label">Analyst / Employee ID *</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="ANL-200999"
                      value={regAnalystId}
                      onChange={e => setRegAnalystId(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Security Division / Org</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="FraudX AI Security"
                      value={regOrg}
                      onChange={e => setRegOrg(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group">
                    <label className="input-label">Designation</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="Fraud Analyst"
                      value={regDesignation}
                      onChange={e => setRegDesignation(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Location / City</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="Chennai / Bengaluru"
                      value={regCity}
                      onChange={e => setRegCity(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group">
                    <label className="input-label">Password *</label>
                    <input
                      className="input"
                      type="password"
                      placeholder="Min 6 chars"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Confirm Password *</label>
                    <input
                      className="input"
                      type="password"
                      placeholder="Repeat password"
                      value={regConfirmPassword}
                      onChange={e => setRegConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                {signUpError && (
                  <div style={{ color: 'var(--risk-high, #EF4444)', fontSize: 'var(--font-size-xs)', padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--border-radius-md)', textAlign: 'center', border: '1px solid rgba(239,68,68,0.2)' }}>
                    {signUpError}
                  </div>
                )}

                <button type="submit" className="btn btn-primary btn-lg w-full">Submit Analyst Application</button>
              </>
            )}
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
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--brand-blue, #4A7BF7)' }}>BIOMETRIC TELEMETRY CHECK</span>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}> — Simulated hardware verification</span>
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
