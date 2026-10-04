import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AnimatedBackground from '../components/AnimatedBackground';
import MFAVerification from '../components/MFA/MFAVerification';
import logoImg from '../assets/logo-original.png';
import './Login.css';

export default function LoginAnalyst() {
  const [tab, setTab] = useState('signin'); // 'signin' | 'enrol'
  const [step, setStep] = useState('credentials'); // 'credentials' | 'face' | 'mfa' | 'complete'
  
  // Sign-in state
  const [analystId, setAnalystId] = useState('');
  const [password, setPassword] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [resolvedEmail, setResolvedEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Enrol / Request Clearance state
  const [enrolName, setEnrolName] = useState('');
  const [enrolEmail, setEnrolEmail] = useState('');
  const [enrolBadgeId, setEnrolBadgeId] = useState('ANL-200001');
  const [enrolDivision, setEnrolDivision] = useState('FraudX AI Security Division');
  const [enrolCity, setEnrolCity] = useState('');
  const [enrolPassword, setEnrolPassword] = useState('');
  const [enrolConfirmPassword, setEnrolConfirmPassword] = useState('');
  const [isEnrolOtp, setIsEnrolOtp] = useState(false);

  // Biometric face state
  const [faceProgress, setFaceProgress] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const { login, register, verifyRegistrationOtp, resendRegistrationOtp } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

  // Handle camera activation and telemetry during face step
  useEffect(() => {
    let interval = null;
    if (step === 'face') {
      setFaceProgress(0);

      // Attempt to access webcam
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: { width: 320, height: 240 } })
          .then((stream) => {
            streamRef.current = stream;
            setCameraActive(true);
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          })
          .catch(() => {
            setCameraActive(false);
          });
      }

      // Progressively advance biometric scan
      interval = setInterval(() => {
        setFaceProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              if (streamRef.current) {
                streamRef.current.getTracks().forEach((trk) => trk.stop());
                streamRef.current = null;
              }
              setCameraActive(false);
              setStep('mfa');
            }, 600);
            return 100;
          }
          return prev + 15;
        });
      }, 250);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((trk) => trk.stop());
        streamRef.current = null;
      }
    };
  }, [step]);

  const handleCredentials = async (e) => {
    e.preventDefault();
    setError('');
    if (!analystId.trim() || !password.trim()) {
      setError('Please enter your Analyst email/ID and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login({
        email: analystId.trim(),
        password: password.trim(),
        role: 'analyst',
      });

      if (res && res.mfa_required) {
        setChallengeId(res.challenge_id || res.session_id);
        setResolvedEmail(res.email || analystId.trim());
        setIsEnrolOtp(false);
        setStep('face');
      } else {
        setStep('complete');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please check your email/ID and password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnrolSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!enrolName.trim() || !enrolEmail.trim() || !enrolPassword.trim()) {
      setError('Please fill in all required clearance request fields (*).');
      return;
    }
    if (enrolPassword !== enrolConfirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }
    if (enrolPassword.length < 6) {
      setError('Password must be at least 6 characters in length.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register({
        name: enrolName.trim(),
        email: enrolEmail.trim(),
        password: enrolPassword.trim(),
        role: 'analyst',
        city: enrolCity.trim() || 'Intelligence HQ',
        phone: enrolBadgeId.trim() || 'ANL-200001',
      });

      setResolvedEmail(enrolEmail.trim());
      setChallengeId(res.challenge_id || res.session_id || '');
      setIsEnrolOtp(true);
      setStep('mfa');
    } catch (err) {
      setError(err.message || 'Clearance request failed. Please check your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async ({ otp, challengeId: cid, email: em }) => {
    if (isEnrolOtp) {
      return await verifyRegistrationOtp({
        email: em || resolvedEmail,
        otp: otp,
        challenge_id: cid || challengeId,
      });
    }
    // Standard login MFA will use default verifyMfa
    return null;
  };

  const handleResendOtp = async ({ challengeId: cid, email: em }) => {
    if (isEnrolOtp) {
      return await resendRegistrationOtp({
        email: em || resolvedEmail,
        challenge_id: cid || challengeId,
      });
    }
    return null;
  };

  const handleMfaSuccess = () => {
    setStep('complete');
    setTimeout(() => {
      navigate('/dashboard');
    }, 1000);
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
          <>
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
                className={`login__tab ${tab === 'enrol' ? 'login__tab--active' : ''}`}
                onClick={() => { setTab('enrol'); setError(''); }}
              >
                Enrol / Request Clearance
              </button>
            </div>

            {error && (
              <div style={{ color: 'var(--risk-high, #EF4444)', fontSize: 'var(--font-size-xs)', padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--border-radius-md)', textAlign: 'center', marginBottom: 12, border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}

            {tab === 'signin' && (
              <form className="login__form animate-fade-in" onSubmit={handleCredentials}>
                <div className="input-group">
                  <label className="input-label" htmlFor="analyst-id">Analyst ID / Email</label>
                  <input
                    id="analyst-id"
                    className="input"
                    type="text"
                    placeholder="analyst@fraudx.ai or ANL-200001"
                    value={analystId}
                    onChange={e => { setAnalystId(e.target.value); setError(''); }}
                    disabled={isSubmitting}
                    autoFocus
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
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    disabled={isSubmitting}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span className="login__access-spinner" style={{ width: 14, height: 14 }} />
                      Verifying Analyst Credentials...
                    </span>
                  ) : (
                    'Analyst Sign In'
                  )}
                </button>
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <span className="text-xs text-tertiary" style={{ fontFamily: 'var(--font-mono)' }}>
                    Default: analyst@fraudx.ai | Password: password123
                  </span>
                </div>
              </form>
            )}

            {tab === 'enrol' && (
              <form className="login__form animate-fade-in" onSubmit={handleEnrolSubmit}>
                <div className="input-group">
                  <label className="input-label">Full Legal Name *</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="e.g. Dr. Jane Doe"
                    value={enrolName}
                    onChange={e => { setEnrolName(e.target.value); setError(''); }}
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Official / Work Email *</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="analyst.name@agency.gov or official email"
                    value={enrolEmail}
                    onChange={e => { setEnrolEmail(e.target.value); setError(''); }}
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group">
                    <label className="input-label">Analyst / Badge ID</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="ANL-200001"
                      value={enrolBadgeId}
                      onChange={e => setEnrolBadgeId(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">City / HQ</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="New Delhi / London"
                      value={enrolCity}
                      onChange={e => setEnrolCity(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Security Division / Unit</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="FraudX AI Security Division"
                    value={enrolDivision}
                    onChange={e => setEnrolDivision(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group">
                    <label className="input-label">Password *</label>
                    <input
                      className="input"
                      type="password"
                      placeholder="Min 6 chars"
                      value={enrolPassword}
                      onChange={e => { setEnrolPassword(e.target.value); setError(''); }}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Confirm Password *</label>
                    <input
                      className="input"
                      type="password"
                      placeholder="Repeat password"
                      value={enrolConfirmPassword}
                      onChange={e => { setEnrolConfirmPassword(e.target.value); setError(''); }}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span className="login__access-spinner" style={{ width: 14, height: 14 }} />
                      Dispatching Clearance OTP...
                    </span>
                  ) : (
                    'Request Security Clearance'
                  )}
                </button>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center', margin: 0 }}>
                  A secure 6-digit OTP will be dispatched to your official email address.
                </p>
              </form>
            )}
          </>
        )}

        {step === 'face' && (
          <div className="login__face animate-fade-in">
            <h2 className="login__step-title">Biometric Face Verification</h2>
            <p className="login__face-status" style={{ margin: '0 0 12px', fontSize: 'var(--font-size-xs)' }}>
              Facial telemetry validation for <strong>{resolvedEmail}</strong>
            </p>

            <div className="face-frame">
              {cameraActive ? (
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
                  className="face-frame__video"
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0F172A' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#FFF' }}>
                    {resolvedEmail ? resolvedEmail.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <span style={{ fontSize: 11, color: '#94A3B8', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
                    TELEMETRY SCAN
                  </span>
                </div>
              )}

              {faceProgress < 100 && (
                <div
                  className="face-frame__scan"
                  style={{ top: `${faceProgress}%` }}
                />
              )}

              {faceProgress >= 100 && (
                <div className="face-frame__success animate-fade-in-scale">
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: 24, fontWeight: 700 }}>
                    ✓
                  </div>
                </div>
              )}
            </div>

            {faceProgress >= 100 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--brand-green, #10B981)', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                <span>✓</span>
                <span>Face Verified</span>
              </div>
            ) : (
              <p className="login__face-status" style={{ color: 'var(--brand-blue, #60A5FA)', margin: 0 }}>
                Analyzing facial telemetry... {faceProgress}%
              </p>
            )}

            <div className="login__demo-badge" style={{ marginTop: 8 }}>
              🔬 BIOMETRIC SENSOR &bull; Live facial geometry validation
            </div>
          </div>
        )}

        {step === 'mfa' && (
          <MFAVerification
            email={resolvedEmail}
            challengeId={challengeId}
            sessionId={challengeId}
            roleName="Analyst"
            title="FraudX AI — Two-Factor Authentication"
            onVerify={isEnrolOtp ? handleVerifyOtp : undefined}
            onResend={isEnrolOtp ? handleResendOtp : undefined}
            onSuccess={handleMfaSuccess}
            onCancel={() => {
              setStep('credentials');
              setError('');
            }}
          />
        )}

        {step === 'complete' && (
          <div className="login__complete animate-fade-in">
            <div className="login__step-check"><span className="login__check">✓</span><span>{t('login.identityVerified')}</span></div>
            <div className="login__step-check"><span className="login__check">✓</span><span>Security clearance validated</span></div>
            <div className="login__step-check"><span className="login__check">✓</span><span>Session encrypted</span></div>
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
