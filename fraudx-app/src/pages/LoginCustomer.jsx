import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AnimatedBackground from '../components/AnimatedBackground';
import MFAVerification from '../components/MFA/MFAVerification';
import logoImg from '../assets/logo-original.png';
import './Login.css';

export default function LoginCustomer() {
  const [tab, setTab] = useState('signin'); // 'signin' | 'register'
  const [step, setStep] = useState('form'); // 'form' | 'mfa' | 'complete'

  // Sign in state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [resolvedEmail, setResolvedEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegOtp, setIsRegOtp] = useState(false);

  // Registration state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const { login, register, verifyRegistrationOtp, resendRegistrationOtp } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter your Customer email/ID and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login({
        email: email.trim(),
        password: password.trim(),
        role: 'customer',
      });

      if (res && res.mfa_required) {
        setChallengeId(res.challenge_id || res.session_id);
        setResolvedEmail(res.email || email.trim());
        setIsRegOtp(false);
        setStep('mfa');
      } else if (res && res.id) {
        setStep('complete');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      }
    } catch (err) {
      setError(err.message || 'Invalid customer credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setError('Please fill in all required registration fields (*).');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters in length.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register({
        name: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim() || '+91 98765 00000',
        city: regCity.trim() || 'Chennai',
        password: regPassword.trim(),
        role: 'customer',
      });

      setResolvedEmail(regEmail.trim());
      setChallengeId(res.challenge_id || res.session_id || '');
      setIsRegOtp(true);
      setStep('mfa');
    } catch (err) {
      setError(err.message || 'Unable to register. Please check your details and try again.');
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
          <h1 className="login__portal-name">{t('login.customerPortal')}</h1>
        </div>

        {step === 'form' && (
          <>
            <div className="login__tabs">
              <button
                type="button"
                className={`login__tab ${tab === 'signin' ? 'login__tab--active' : ''}`}
                onClick={() => { setTab('signin'); setError(''); }}
              >
                Customer Sign In
              </button>
              <button
                type="button"
                className={`login__tab ${tab === 'register' ? 'login__tab--active' : ''}`}
                onClick={() => { setTab('register'); setError(''); }}
              >
                Register
              </button>
            </div>

            {error && (
              <div style={{ color: 'var(--risk-high, #EF4444)', fontSize: 'var(--font-size-xs)', padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--border-radius-md)', textAlign: 'center', marginBottom: 12, border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}

            {tab === 'signin' && (
              <form className="login__form animate-fade-in" onSubmit={handleSignIn}>
                <div className="input-group">
                  <label className="input-label" htmlFor="customer-id">{t('login.customerId')}</label>
                  <input
                    id="customer-id"
                    className="input"
                    type="text"
                    placeholder="customer@fraudx.ai or member ID"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="customer-pwd">{t('login.password')}</label>
                  <input
                    id="customer-pwd"
                    className="input"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="login__options">
                  <label className="login__remember">
                    <input type="checkbox" defaultChecked /> <span>{t('login.rememberMe')}</span>
                  </label>
                  <a href="#" className="login__forgot" onClick={(e) => { e.preventDefault(); alert('For account assistance, please contact your cooperative society administrator.'); }}>
                    {t('login.forgotPassword')}
                  </a>
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
                    'Customer Sign In'
                  )}
                </button>

                <div className="login__demo-note" style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                  <span>Default Member Account</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                    Email: customer@fraudx.ai &nbsp;|&nbsp; Password: password123
                  </span>
                </div>
              </form>
            )}

            {tab === 'register' && (
              <form className="login__form animate-fade-in" onSubmit={handleSignUp}>
                <div className="input-group">
                  <label className="input-label">Full Name *</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="e.g. Ramesh Patel"
                    value={regName}
                    onChange={e => { setRegName(e.target.value); setError(''); }}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Email Address *</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="your.email@example.com"
                    value={regEmail}
                    onChange={e => { setRegEmail(e.target.value); setError(''); }}
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group">
                    <label className="input-label">Phone</label>
                    <input
                      className="input"
                      type="tel"
                      placeholder="+91 98765 00000"
                      value={regPhone}
                      onChange={e => setRegPhone(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">City</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="Chennai / Mumbai"
                      value={regCity}
                      onChange={e => setRegCity(e.target.value)}
                      disabled={isSubmitting}
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
                      Sending 6-Digit OTP...
                    </span>
                  ) : (
                    'Register Account'
                  )}
                </button>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center', margin: 0 }}>
                  A 6-digit verification OTP will be sent to your registered email address.
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
            roleName="Customer"
            title="FraudX AI — Two-Factor Authentication"
            onVerify={isRegOtp ? handleVerifyOtp : undefined}
            onResend={isRegOtp ? handleResendOtp : undefined}
            onSuccess={handleMfaSuccess}
            onCancel={() => {
              setStep('form');
              setError('');
            }}
          />
        )}

        {step === 'complete' && (
          <div className="login__complete animate-fade-in">
            <div className="login__step-check"><span className="login__check">✓</span><span>Credentials confirmed</span></div>
            <div className="login__step-check"><span className="login__check">✓</span><span>Email verified via OTP</span></div>
            <div className="login__access-msg">
              <div className="login__access-spinner" />
              <span>Redirecting to your customer dashboard...</span>
            </div>
          </div>
        )}
      </div>
      <div className="welcome__orb welcome__orb--1" />
      <div className="welcome__orb welcome__orb--2" />
    </div>
  );
}
