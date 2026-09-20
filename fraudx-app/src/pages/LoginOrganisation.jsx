import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AnimatedBackground from '../components/AnimatedBackground';
import MFAVerification from '../components/MFA/MFAVerification';
import logoImg from '../assets/logo-original.png';
import './Login.css';

const DEMO_MFA_CODE = '739215';

export default function LoginOrganisation() {
  const [step, setStep] = useState('credentials');
  const [orgId, setOrgId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

  const handleCredentials = (e) => {
    e.preventDefault();
    setError('');
    if (!orgId.trim() || !email.trim() || !password.trim()) {
      setError('Please enter Organisation ID, admin email, and password.');
      return;
    }
    setStep('mfa');
  };

  const handleMfaSuccess = () => {
    setStep('complete');
    setTimeout(() => {
      login('organisation');
      navigate('/dashboard');
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

        {step === 'credentials' && (
          <form className="login__form animate-fade-in" onSubmit={handleCredentials}>
            <div className="input-group">
              <label className="input-label" htmlFor="org-id">{t('login.orgId')}</label>
              <input id="org-id" className="input" type="text" placeholder="ORG-300001" value={orgId} onChange={e => { setOrgId(e.target.value); setError(''); }} />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="org-email">{t('login.adminEmail')}</label>
              <input id="org-email" className="input" type="email" placeholder="admin@fraudx.ai" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="org-pwd">{t('login.password')}</label>
              <input id="org-pwd" className="input" type="password" placeholder="••••••••" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} />
            </div>
            {error && (
              <div style={{ color: 'var(--risk-high, #EF4444)', fontSize: 'var(--font-size-xs)', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--border-radius-md)', textAlign: 'center' }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-lg w-full">{t('login.signIn')}</button>
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <span className="text-xs text-tertiary" style={{ fontFamily: 'var(--font-mono)' }}>
                Demo — ID: ORG-300001 | Email: vikram.mehta@fraudx.ai | Password: fraudx2024
              </span>
            </div>
          </form>
        )}

        {step === 'mfa' && (
          <div>
            <div className="login__step-check" style={{ marginBottom: 16, justifyContent: 'center' }}>
              <span className="login__check">✓</span>
              <span>Credentials verified</span>
            </div>
            <MFAVerification
              demoCode={DEMO_MFA_CODE}
              roleName="Organisation"
              onSuccess={handleMfaSuccess}
              onCancel={() => setStep('credentials')}
            />
          </div>
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
