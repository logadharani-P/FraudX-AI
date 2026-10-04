import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AnimatedBackground from '../components/AnimatedBackground';
import MFAVerification from '../components/MFA/MFAVerification';
import logoImg from '../assets/logo-original.png';
import './Login.css';

export default function LoginOrganisation() {
  const [tab, setTab] = useState('signin'); // 'signin' | 'register'
  const [step, setStep] = useState('credentials'); // 'credentials' | 'mfa' | 'complete'
  
  // Sign-in state
  const [orgId, setOrgId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [resolvedEmail, setResolvedEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegOtp, setIsRegOtp] = useState(false);

  // Registration state
  const [orgName, setOrgName] = useState('');
  const [regOrgId, setRegOrgId] = useState('ORG-APEX-01');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const { login, register, verifyRegistrationOtp, resendRegistrationOtp } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

  const handleCredentials = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter your Organisation admin email/ID and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login({
        email: email.trim(),
        password: password.trim(),
        role: 'organisation',
      });

      if (res && res.mfa_required) {
        setChallengeId(res.challenge_id || res.session_id);
        setResolvedEmail(res.email || email.trim());
        setIsRegOtp(false);
        setStep('mfa');
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

  const handleRegisterOrg = async (e) => {
    e.preventDefault();
    setError('');

    if (!orgName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setError('Please fill in all required organisation fields (*).');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters in length.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register({
        name: orgName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim() || '+91 98765 00000',
        city: regCity.trim() || 'Financial District',
        password: regPassword.trim(),
        role: 'organisation',
      });

      setResolvedEmail(regEmail.trim());
      setChallengeId(res.challenge_id || res.session_id || '');
      setIsRegOtp(true);
      setStep('mfa');
    } catch (err) {
      setError(err.message || 'Organisation registration failed. Please check details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async ({ otp, challengeId: cid, email: em }) => {
    if (isRegOtp) {
      return await verifyRegistrationOtp({
        email: em || resolvedEmail,
        otp: otp,
        challenge_id: cid || challengeId,
      });
    }
    return null;
  };

  const handleResendOtp = async ({ challengeId: cid, email: em }) => {
    if (isRegOtp) {
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
      <div className="login__card animate-fade-in-scale">
        <div className="login__header">
          <img src={logoImg} alt="FraudX AI" className="login__logo" />
          <h1 className="login__portal-name">{t('login.orgPortal')}</h1>
        </div>

        {step === 'credentials' && (
          <>
            <div className="login__tabs">
              <button
                type="button"
                className={`login__tab ${tab === 'signin' ? 'login__tab--active' : ''}`}
                onClick={() => { setTab('signin'); setError(''); }}
              >
                Organisation Sign In
              </button>
              <button
                type="button"
                className={`login__tab ${tab === 'register' ? 'login__tab--active' : ''}`}
                onClick={() => { setTab('register'); setError(''); }}
              >
                Register Organisation
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
                  <label className="input-label" htmlFor="org-id">{t('login.orgId')}</label>
                  <input
                    id="org-id"
                    className="input"
                    type="text"
                    placeholder="ORG-APEX-01 (Optional)"
                    value={orgId}
                    onChange={e => { setOrgId(e.target.value); setError(''); }}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="org-email">{t('login.adminEmail')}</label>
                  <input
                    id="org-email"
                    className="input"
                    type="email"
                    placeholder="admin@fraudx.ai"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="org-pwd">{t('login.password')}</label>
                  <input
                    id="org-pwd"
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
                      Signing In...
                    </span>
                  ) : (
                    'Organisation Sign In'
                  )}
                </button>
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <span className="text-xs text-tertiary" style={{ fontFamily: 'var(--font-mono)' }}>
                    Default: admin@fraudx.ai | Password: password123
                  </span>
                </div>
              </form>
            )}

            {tab === 'register' && (
              <form className="login__form animate-fade-in" onSubmit={handleRegisterOrg}>
                <div className="input-group">
                  <label className="input-label">Organisation / Society Name *</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="e.g. Apex Multi-State Credit Cooperative"
                    value={orgName}
                    onChange={e => { setOrgName(e.target.value); setError(''); }}
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Official Administrator Email *</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="admin@apex-coop.org"
                    value={regEmail}
                    onChange={e => { setRegEmail(e.target.value); setError(''); }}
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group">
                    <label className="input-label">Organisation ID</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="ORG-APEX-01"
                      value={regOrgId}
                      onChange={e => setRegOrgId(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">City / HQ</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="Mumbai / Delhi"
                      value={regCity}
                      onChange={e => setRegCity(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Official Phone</label>
                  <input
                    className="input"
                    type="tel"
                    placeholder="+91 22 2845 0000"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
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
                      value={regPassword}
                      onChange={e => { setRegPassword(e.target.value); setError(''); }}
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
                      value={regConfirmPassword}
                      onChange={e => { setRegConfirmPassword(e.target.value); setError(''); }}
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
                      Registering Organisation...
                    </span>
                  ) : (
                    'Register Organisation'
                  )}
                </button>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center', margin: 0 }}>
                  A 6-digit verification OTP will be sent to the official administrator email.
                </p>
              </form>
            )}
          </>
        )}

        {step === 'mfa' && (
          <MFAVerification
            email={resolvedEmail}
            challengeId={challengeId}
            sessionId={challengeId}
            roleName="Organisation"
            title="FraudX AI — Two-Factor Authentication"
            onVerify={isRegOtp ? handleVerifyOtp : undefined}
            onResend={isRegOtp ? handleResendOtp : undefined}
            onSuccess={handleMfaSuccess}
            onCancel={() => {
              setStep('credentials');
              setError('');
            }}
          />
        )}

        {step === 'complete' && (
          <div className="login__complete animate-fade-in">
            <div className="login__step-check"><span className="login__check">✓</span><span>Organisation credentials verified</span></div>
            <div className="login__step-check"><span className="login__check">✓</span><span>Admin email validated via OTP</span></div>
            <div className="login__access-msg">
              <div className="login__access-spinner" />
              <span>{t('login.accessOrgConsole')}</span>
            </div>
          </div>
        )}
      </div>
      <div className="welcome__orb welcome__orb--1" />
      <div className="welcome__orb welcome__orb--2" />
    </div>
  );
}
