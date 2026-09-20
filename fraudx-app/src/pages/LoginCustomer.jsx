import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AnimatedBackground from '../components/AnimatedBackground';
import logoImg from '../assets/logo-original.png';
import './Login.css';

export default function LoginCustomer() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter your Customer ID and password.');
      return;
    }
    login('customer');
    navigate('/dashboard');
  };

  return (
    <div className="login">
      <AnimatedBackground />
      <div className="login__card animate-fade-in-scale">
        <div className="login__header">
          <img src={logoImg} alt="FraudX AI" className="login__logo" />
          <h1 className="login__portal-name">{t('login.customerPortal')}</h1>
        </div>
        <form className="login__form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="customer-id">{t('login.customerId')}</label>
            <input id="customer-id" className="input" type="text" placeholder="CUS-100001 or email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="customer-pwd">{t('login.password')}</label>
            <input id="customer-pwd" className="input" type="password" placeholder="••••••••" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} />
          </div>
          {error && (
            <div style={{ color: 'var(--risk-high, #EF4444)', fontSize: 'var(--font-size-xs)', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--border-radius-md)', textAlign: 'center' }}>
              {error}
            </div>
          )}
          <div className="login__options">
            <label className="login__remember">
              <input type="checkbox" /> <span>{t('login.rememberMe')}</span>
            </label>
            <a href="#" className="login__forgot">{t('login.forgotPassword')}</a>
          </div>
          <button type="submit" className="btn btn-primary btn-lg w-full">{t('login.signIn')}</button>
        </form>
        <div className="login__demo-note" style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
          <span>Demo Mode — Use credentials below</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
            ID: CUS-100001 &nbsp;|&nbsp; Password: arjun2024
          </span>
        </div>
      </div>
      <div className="welcome__orb welcome__orb--1" />
      <div className="welcome__orb welcome__orb--2" />
    </div>
  );
}
