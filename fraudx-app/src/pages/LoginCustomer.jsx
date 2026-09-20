import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AnimatedBackground from '../components/AnimatedBackground';
import logoImg from '../assets/logo-original.png';
import './Login.css';

export default function LoginCustomer() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [memberId, setMemberId] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        if (!name.trim() || !email.trim() || !password) {
          setError('Please provide Name, Email, and Password.');
          setLoading(false);
          return;
        }
        await register({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: phone.trim() || undefined,
          city: city.trim() || undefined,
          member_id: memberId.trim() || undefined,
          role: 'customer',
        });
      } else {
        const loginEmail = email.trim() || 'customer@fraudx.ai';
        const loginPassword = password || 'password123';
        await login({ email: loginEmail, password: loginPassword, role: 'customer' });
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <AnimatedBackground />
      <div className="login__card animate-fade-in-scale">
        <div className="login__header">
          <img src={logoImg} alt="FraudX AI" className="login__logo" />
          <h1 className="login__portal-name">
            {isRegistering ? 'Register Customer Account' : t('login.customerPortal')}
          </h1>
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

        <form className="login__form" onSubmit={handleSubmit}>
          {isRegistering && (
            <div className="input-group">
              <label className="input-label" htmlFor="customer-name">Full Name *</label>
              <input
                id="customer-name"
                className="input"
                type="text"
                placeholder="e.g. Sarah Jenkins"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label" htmlFor="customer-id">
              {isRegistering ? 'Email Address *' : t('login.customerId')}
            </label>
            <input
              id="customer-id"
              className="input"
              type={isRegistering ? 'email' : 'text'}
              placeholder={isRegistering ? 'sarah@example.com' : 'CUS-100001 or customer@fraudx.ai'}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required={isRegistering}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="customer-pwd">
              {t('login.password')} {isRegistering && '*'}
            </label>
            <input
              id="customer-pwd"
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required={isRegistering}
            />
          </div>

          {isRegistering && (
            <>
              <div className="input-group">
                <label className="input-label" htmlFor="customer-phone">Phone (Optional)</label>
                <input
                  id="customer-phone"
                  className="input"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="customer-city">City (Optional)</label>
                <input
                  id="customer-city"
                  className="input"
                  type="text"
                  placeholder="e.g. Chennai"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                />
              </div>
            </>
          )}

          {!isRegistering && (
            <div className="login__options">
              <label className="login__remember">
                <input type="checkbox" /> <span>{t('login.rememberMe')}</span>
              </label>
              <a href="#" className="login__forgot">{t('login.forgotPassword')}</a>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
            {loading ? 'Authenticating...' : isRegistering ? 'Create Account & Sign In' : t('login.signIn')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--brand-blue)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)',
              textDecoration: 'underline',
            }}
          >
            {isRegistering
              ? 'Already have an account? Sign In'
              : "Don't have an account? Register new user"}
          </button>
        </div>

        {!isRegistering && (
          <p className="login__demo-note">Default Demo: customer@fraudx.ai / password123</p>
        )}
      </div>
      <div className="welcome__orb welcome__orb--1" />
      <div className="welcome__orb welcome__orb--2" />
    </div>
  );
}
