import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AnimatedBackground from '../components/AnimatedBackground';
import MFAVerification from '../components/MFA/MFAVerification';
import logoImg from '../assets/logo-original.png';
import './Login.css';

export default function LoginAnalyst() {
  const [step, setStep] = useState('credentials'); // credentials, mfa, complete
  const [analystId, setAnalystId] = useState('');
  const [password, setPassword] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [resolvedEmail, setResolvedEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

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
        setStep('mfa');
      } else {
        // Direct session completion if token was issued
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

  const handleMfaSuccess = (user) => {
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
          <form className="login__form animate-fade-in" onSubmit={handleCredentials}>
            <div className="input-group">
              <label className="input-label" htmlFor="analyst-id">{t('login.analystId')}</label>
              <input
                id="analyst-id"
                className="input"
                type="text"
                placeholder="analyst@fraudx.ai or ANL-88210"
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
            {error && (
              <div style={{ color: 'var(--risk-high, #EF4444)', fontSize: 'var(--font-size-xs)', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--border-radius-md)', textAlign: 'center' }}>
                {error}
              </div>
            )}
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
                t('login.signIn')
              )}
            </button>
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <span className="text-xs text-tertiary" style={{ fontFamily: 'var(--font-mono)' }}>
                Default: analyst@fraudx.ai | Password: password123
              </span>
            </div>
          </form>
        )}

        {step === 'mfa' && (
          <MFAVerification
            email={resolvedEmail}
            challengeId={challengeId}
            sessionId={challengeId}
            roleName="Analyst"
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
            <div className="login__step-check"><span className="login__check">✓</span><span>Email code verified</span></div>
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
