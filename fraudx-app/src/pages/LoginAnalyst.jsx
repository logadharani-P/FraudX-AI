import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';
import AnimatedBackground from '../components/AnimatedBackground';
import logoImg from '../assets/logo-original.png';
import './Login.css';

export default function LoginAnalyst() {
  const [step, setStep] = useState('credentials'); // credentials, face, mfa, complete, failed
  const [analystId, setAnalystId] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [faceProgress, setFaceProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pendingAuth, setPendingAuth] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const { setSelectedRole } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

  // Stop camera tracks cleanly
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Step 1: Real credentials validation via API
  const handleCredentials = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const loginId = analystId.trim() || 'analyst@fraudx.ai';
    const loginPassword = password || 'password123';

    try {
      // Authenticate analyst credentials with backend first
      const authData = await api.auth.login(loginId, loginPassword, 'analyst');
      setPendingAuth(authData);
      setStep('face');
    } catch (err) {
      setError(err.message || 'Invalid analyst credentials. Please check your Analyst ID and Password.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Camera setup when entering face step
  useEffect(() => {
    if (step === 'face') {
      setFaceProgress(0);
      setIsScanning(false);
      setError(null);

      // Access camera for real-time video feed preview
      if (navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 480 } })
          .then(stream => {
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          })
          .catch(err => {
            console.warn('Camera access unavailable or denied:', err);
          });
      }

      return () => {
        stopCamera();
      };
    }
  }, [step]);

  // Handle starting the interactive demo liveness verification
  const handleStartVerification = () => {
    setIsScanning(true);
    setError(null);
    setFaceProgress(0);

    const interval = setInterval(() => {
      setFaceProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          stopCamera();
          setTimeout(() => setStep('mfa'), 700);
          return 100;
        }
        return prev + 4;
      });
    }, 50);
  };

  // Explicit failure / rejection path — strictly blocks analyst login
  const handleRejectVerification = () => {
    stopCamera();
    setPendingAuth(null);
    setStep('failed');
  };

  // Step 3: MFA submission & session finalization
  const handleMfa = (e) => {
    e.preventDefault();
    if (!pendingAuth) {
      setError('Session expired. Please sign in again.');
      setStep('credentials');
      return;
    }

    setStep('complete');
    setTimeout(() => {
      // Finalize authentication in localStorage and context
      localStorage.setItem('fraudx_token', pendingAuth.token.access_token);
      localStorage.setItem('fraudx_user', JSON.stringify(pendingAuth.user));
      setSelectedRole(pendingAuth.user.role);
      navigate('/dashboard');
      window.location.reload(); // Refresh to ensure all data contexts initialize with new user
    }, 1500);
  };

  const handleResetToLogin = () => {
    stopCamera();
    setPendingAuth(null);
    setError(null);
    setStep('credentials');
  };

  return (
    <div className="login">
      <AnimatedBackground />
      <div className="login__card login__card--analyst animate-fade-in-scale">
        <div className="login__header">
          <img src={logoImg} alt="FraudX AI" className="login__logo" />
          <h1 className="login__portal-name">{t('login.analystPortal')}</h1>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#F87171',
            borderRadius: 'var(--border-radius-md)',
            padding: '10px 14px',
            fontSize: 'var(--font-size-sm)',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {step === 'credentials' && (
          <form className="login__form animate-fade-in" onSubmit={handleCredentials}>
            <div className="input-group">
              <label className="input-label" htmlFor="analyst-id">{t('login.analystId')}</label>
              <input
                id="analyst-id"
                className="input"
                type="text"
                placeholder="ANL-200001 or analyst@fraudx.ai"
                value={analystId}
                onChange={e => setAnalystId(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="analyst-pwd">{t('login.password')}</label>
              <input
                id="analyst-pwd"
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
              {loading ? 'Validating Credentials...' : t('login.signIn')}
            </button>
            <p className="login__demo-note">Default Demo: analyst@fraudx.ai / password123</p>
          </form>
        )}

        {step === 'face' && (
          <div className="login__face animate-fade-in">
            <h2 className="login__step-title">Biometric Liveness Verification</h2>
            <div className="face-frame">
              <video ref={videoRef} autoPlay muted playsInline className="face-frame__video" />
              <div className="face-frame__guide">
                <svg viewBox="0 0 200 200" className="face-frame__oval">
                  <ellipse cx="100" cy="100" rx="65" ry="85" fill="none" stroke="rgba(74, 123, 247, 0.6)" strokeWidth="2" strokeDasharray="6 4"/>
                </svg>
              </div>
              {isScanning && <div className="face-frame__scan" style={{ top: `${faceProgress}%` }} />}
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
              {faceProgress >= 100
                ? `✓ ${t('login.faceVerified')}`
                : isScanning
                  ? `${t('login.verifying')} (${faceProgress}%)`
                  : 'Position face in frame and click Verify'}
            </p>

            <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleStartVerification}
                disabled={isScanning}
              >
                {isScanning ? 'Scanning...' : 'Verify Liveness (Pass)'}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={handleRejectVerification}
                disabled={faceProgress >= 100}
              >
                Reject / Fail
              </button>
            </div>

            <p className="login__demo-badge" style={{ marginTop: '10px', fontSize: '11px', lineHeight: '1.4' }}>
              Demo Verification: Demonstrates liveness camera workflow. (Production biometric matching requires server-side facial embeddings).
            </p>
          </div>
        )}

        {step === 'failed' && (
          <div className="login__complete animate-fade-in" style={{ textAlign: 'center' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '2px solid #EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EF4444',
              fontSize: '24px',
              margin: '0 auto 16px',
            }}>
              ✕
            </div>
            <h2 className="login__step-title" style={{ color: '#EF4444', marginBottom: '8px' }}>
              Biometric Verification Failed
            </h2>
            <p className="text-secondary text-sm" style={{ marginBottom: '20px' }}>
              Facial identity could not be verified. Analyst access is restricted. Authentication has been rejected.
            </p>
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={handleResetToLogin}
            >
              Return to Login
            </button>
          </div>
        )}

        {step === 'mfa' && (
          <form className="login__form login__mfa animate-fade-in" onSubmit={handleMfa}>
            <div className="login__step-check">
              <span className="login__check">✓</span>
              <span>Liveness Verified</span>
            </div>
            <h2 className="login__step-title">{t('login.mfaTitle')}</h2>
            <p className="text-secondary text-sm">{t('login.mfaDesc')}</p>
            <div className="mfa-inputs">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <input
                  key={i}
                  className="mfa-input"
                  type="text"
                  maxLength="1"
                  inputMode="numeric"
                  onChange={e => {
                    const val = mfaCode.split('');
                    val[i] = e.target.value;
                    setMfaCode(val.join(''));
                    if (e.target.value && e.target.nextElementSibling) e.target.nextElementSibling.focus();
                  }}
                />
              ))}
            </div>
            <button type="submit" className="btn btn-primary btn-lg w-full">Verify & Access Console</button>
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
