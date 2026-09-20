import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';
import AnimatedBackground from '../components/AnimatedBackground';
import logoImg from '../assets/logo-original.png';
import './Login.css';

export default function LoginOrganisation() {
  const [step, setStep] = useState('credentials'); // credentials, mfa, complete
  const [orgId, setOrgId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pendingAuth, setPendingAuth] = useState(null);

  const { setSelectedRole } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

  const handleCredentials = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const loginIdentifier = email.trim() || orgId.trim() || 'admin@fraudx.ai';
    const loginPassword = password || 'password123';

    try {
      const authData = await api.auth.login(loginIdentifier, loginPassword, 'organisation');
      setPendingAuth(authData);
      setStep('mfa');
    } catch (err) {
      setError(err.message || 'Invalid organisation credentials. Please check your Email / Org ID and Password.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfa = (e) => {
    e.preventDefault();
    if (!pendingAuth) {
      setError('Session expired. Please sign in again.');
      setStep('credentials');
      return;
    }

    setStep('complete');
    setTimeout(() => {
      localStorage.setItem('fraudx_token', pendingAuth.token.access_token);
      localStorage.setItem('fraudx_user', JSON.stringify(pendingAuth.user));
      setSelectedRole(pendingAuth.user.role);
      navigate('/dashboard');
      window.location.reload();
    }, 1200);
  };

  return (
    <div className="login">
      <AnimatedBackground />
      <div className="login__card animate-fade-in-scale">
        <div className="login__header">
          <img src={logoImg} alt="FraudX AI" className="login__logo" />
          <h1 className="login__portal-name">{t('login.orgPortal')}</h1>
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
              <label className="input-label" htmlFor="org-id">{t('login.orgId')}</label>
              <input
                id="org-id"
                className="input"
                type="text"
                placeholder="ORG-300001 (Optional if email is provided)"
                value={orgId}
                onChange={e => setOrgId(e.target.value)}
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
                onChange={e => setEmail(e.target.value)}
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
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
              {loading ? 'Validating Credentials...' : t('login.signIn')}
            </button>
            <p className="login__demo-note">Default Demo: admin@fraudx.ai / password123</p>
          </form>
        )}

        {step === 'mfa' && (
          <form className="login__form login__mfa animate-fade-in" onSubmit={handleMfa}>
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
            <button type="submit" className="btn btn-primary btn-lg w-full">Verify & Access Org Console</button>
          </form>
        )}

        {step === 'complete' && (
          <div className="login__complete animate-fade-in">
            <div className="login__step-check"><span className="login__check">✓</span><span>{t('login.mfaVerified')}</span></div>
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
