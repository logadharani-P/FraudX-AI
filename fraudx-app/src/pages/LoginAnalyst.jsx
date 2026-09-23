import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AnimatedBackground from '../components/AnimatedBackground';
import MFAVerification from '../components/MFA/MFAVerification';
import logoImg from '../assets/logo.svg';
import './Login.css';

export default function LoginAnalyst() {
  const [tab, setTab] = useState('signin'); // 'signin' or 'signup'
  const [step, setStep] = useState('credentials'); // credentials, face, mfa, complete
  
  // Sign In state
  const [analystId, setAnalystId] = useState('');
  const [password, setPassword] = useState('');
  const [authenticatedAnalyst, setAuthenticatedAnalyst] = useState(null);
  const [capturedFaceUrl, setCapturedFaceUrl] = useState(null);
  const [faceProgress, setFaceProgress] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
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

    setAuthenticatedAnalyst(authResult.user);
    setCapturedFaceUrl(null);
    setFaceProgress(0);
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
      let mfaTimeout = null;

      // Access camera if available
      navigator.mediaDevices?.getUserMedia({ video: { width: 320, height: 320, facingMode: 'user' } })
        .then(stream => {
          streamRef.current = stream;
          setCameraActive(true);
        })
        .catch(() => {
          // Camera not available, fallback to profile/biometric frame
          setCameraActive(false);
        });

      // Simulate biometric telemetry verification
      const interval = setInterval(() => {
        setFaceProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);

            // Capture face snapshot from video feed if available
            try {
              if (videoRef.current && streamRef.current) {
                const canvas = document.createElement('canvas');
                canvas.width = 240;
                canvas.height = 240;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(videoRef.current, 0, 0, 240, 240);
                setCapturedFaceUrl(canvas.toDataURL('image/jpeg'));
              }
            } catch {
              // Video stream unreadable
            }

            mfaTimeout = setTimeout(() => setStep('mfa'), 1200);
            return 100;
          }
          return prev + 3;
        });
      }, 50);

      return () => {
        clearInterval(interval);
        if (mfaTimeout) clearTimeout(mfaTimeout);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        setCameraActive(false);
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
          <div className="login__face animate-fade-in" style={{ textAlign: 'center' }}>
            <h2 className="login__step-title" style={{ marginBottom: 4 }}>{t('login.faceVerification')}</h2>
            <p className="text-xs text-secondary" style={{ marginBottom: 16 }}>
              Biometric verification for <strong>{authenticatedAnalyst?.name || 'Authorized Analyst'}</strong>
            </p>

            {/* Professional Biometric Verification Frame */}
            <div
              className="face-biometric-container"
              style={{
                position: 'relative',
                width: 170,
                height: 170,
                margin: '0 auto 16px',
                borderRadius: 'var(--border-radius-xl, 20px)',
                overflow: 'hidden',
                border: faceProgress >= 100
                  ? '2px solid var(--risk-low, #22C55E)'
                  : '2px solid var(--brand-blue, #4A7BF7)',
                boxShadow: faceProgress >= 100
                  ? '0 0 24px rgba(34, 197, 94, 0.4), inset 0 0 16px rgba(34, 197, 94, 0.2)'
                  : '0 0 20px rgba(74, 123, 247, 0.3), inset 0 0 16px rgba(74, 123, 247, 0.15)',
                background: 'var(--bg-secondary, #0F172A)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 300ms ease',
              }}
            >
              {/* If camera stream is live and not finished, show video */}
              {cameraActive && faceProgress < 100 ? (
                <video
                  ref={el => {
                    videoRef.current = el;
                    if (el && streamRef.current && el.srcObject !== streamRef.current) {
                      el.srcObject = streamRef.current;
                    }
                  }}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : capturedFaceUrl ? (
                <img
                  src={capturedFaceUrl}
                  alt={authenticatedAnalyst?.name || 'Analyst Face'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : authenticatedAnalyst?.avatar ? (
                <img
                  src={authenticatedAnalyst.avatar}
                  alt={authenticatedAnalyst.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                /* Authentic Biometric Persona Placeholder */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      background: 'var(--gradient-brand)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 32,
                      fontWeight: 700,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    }}
                  >
                    {authenticatedAnalyst?.name?.charAt(0) || 'P'}
                  </div>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)', marginTop: 8 }}>
                    {authenticatedAnalyst?.name || 'Priya Iyer'}
                  </span>
                  <span className="text-mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                    {authenticatedAnalyst?.id || 'ANL-200001'}
                  </span>
                </div>
              )}

              {/* Scanning Laser Beam */}
              {faceProgress > 0 && faceProgress < 100 && (
                <div
                  className="face-frame__scan"
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: `${faceProgress}%`,
                    height: 2,
                    background: 'var(--brand-cyan, #22D3EE)',
                    boxShadow: '0 0 10px var(--brand-cyan, #22D3EE), 0 0 20px var(--brand-cyan, #22D3EE)',
                  }}
                />
              )}

              {/* Success Checkmark overlay when verified */}
              {faceProgress >= 100 && (
                <div
                  className="animate-fade-in-scale"
                  style={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'var(--risk-low, #22C55E)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
                    fontSize: 18,
                    fontWeight: 900,
                  }}
                >
                  ✓
                </div>
              )}
            </div>

            {/* Biometric Status Indicator matching specification:
                [ Analyst Face Image ]
                      ✓
                Face Verified
            */}
            {faceProgress >= 100 ? (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: 20, color: 'var(--risk-low, #22C55E)', fontWeight: 800 }}>✓</span>
                <p className="login__face-status" style={{ color: 'var(--risk-low, #22C55E)', fontWeight: 700, margin: 0 }}>
                  Face Verified
                </p>
              </div>
            ) : faceProgress > 0 ? (
              <p className="login__face-status" style={{ color: 'var(--brand-blue, #4A7BF7)', fontWeight: 600, margin: 0 }}>
                Scanning / Verifying...
              </p>
            ) : (
              <p className="login__face-status" style={{ color: 'var(--text-secondary)', margin: 0 }}>
                Initializing biometric sensor...
              </p>
            )}

            <div className="login__demo-badge" style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', padding: '6px 14px', background: 'rgba(74, 123, 247, 0.08)', borderRadius: 'var(--border-radius-md)', marginTop: 12, border: '1px solid var(--border-secondary)' }}>
              <span style={{ fontSize: '0.9rem' }}>🔬</span>
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--brand-blue, #4A7BF7)' }}>BIOMETRIC SENSOR</span>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}> — Facial telemetry validation</span>
            </div>
          </div>
        )}

        {step === 'mfa' && (
          <div>
            <div className="login__step-check" style={{ marginBottom: 16, justifyContent: 'center' }}>
              <span className="login__check">✓</span>
              <span>Face Verified</span>
            </div>
            <MFAVerification
              userEmail={authenticatedAnalyst?.email || 'priya.iyer@fraudx.ai'}
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
