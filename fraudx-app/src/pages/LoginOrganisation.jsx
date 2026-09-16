import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AnimatedBackground from '../components/AnimatedBackground';
import logoImg from '../assets/logo-original.png';
import './Login.css';

export default function LoginOrganisation() {
  const [step, setStep] = useState('credentials');
  const [orgId, setOrgId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const { login } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

  const handleCredentials = (e) => {
    e.preventDefault();
    setStep('mfa');
  };

  const handleMfa = (e) => {
    e.preventDefault();
    setStep('complete');
    setTimeout(() => {
      login('organisation');
      navigate('/dashboard');
    }, 1500);
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
              <input id="org-id" className="input" type="text" placeholder="ORG-300001" value={orgId} onChange={e => setOrgId(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="org-email">{t('login.adminEmail')}</label>
              <input id="org-email" className="input" type="email" placeholder="admin@fraudx.ai" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="org-pwd">{t('login.password')}</label>
              <input id="org-pwd" className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-lg w-full">{t('login.signIn')}</button>
          </form>
        )}

        {step === 'mfa' && (
          <form className="login__form login__mfa animate-fade-in" onSubmit={handleMfa}>
            <h2 className="login__step-title">{t('login.mfaTitle')}</h2>
            <p className="text-secondary text-sm">{t('login.mfaDesc')}</p>
            <div className="mfa-inputs">
              {[0,1,2,3,4,5].map(i => (
                <input key={i} className="mfa-input" type="text" maxLength="1" inputMode="numeric"
                  onChange={e => {
                    const val = mfaCode.split('');
                    val[i] = e.target.value;
                    setMfaCode(val.join(''));
                    if (e.target.value && e.target.nextElementSibling) e.target.nextElementSibling.focus();
                  }}
                />
              ))}
            </div>
            <button type="submit" className="btn btn-primary btn-lg w-full">Verify</button>
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

        <p className="login__demo-note">Demo Mode — Click Sign In to continue</p>
      </div>
      <div className="welcome__orb welcome__orb--1" />
      <div className="welcome__orb welcome__orb--2" />
    </div>
  );
}
