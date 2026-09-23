import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AnimatedBackground from '../components/AnimatedBackground';
import MFAVerification from '../components/MFA/MFAVerification';
import logoImg from '../assets/logo.svg';
import './Login.css';

export default function LoginCustomer() {
  const [tab, setTab] = useState('signin'); // 'signin' or 'signup'
  const [step, setStep] = useState('credentials'); // 'credentials', 'mfa', 'complete'
  const [authenticatedCustomer, setAuthenticatedCustomer] = useState(null);
  
  // Sign in state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [signInError, setSignInError] = useState('');
  
  // Sign up state
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [signUpError, setSignUpError] = useState('');
  const [signUpSuccess, setSignUpSuccess] = useState(null);

  const { authenticate, registerCustomer } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

  const handleSignIn = (e) => {
    e.preventDefault();
    setSignInError('');

    if (!identifier.trim() || !password.trim()) {
      setSignInError('Please enter your Customer ID or Email, and password.');
      return;
    }

    const res = authenticate('customer', { identifier, password });
    if (!res.success) {
      setSignInError(res.error || 'Authentication failed. Please check your credentials.');
      return;
    }

    setAuthenticatedCustomer(res.user);
    setStep('mfa');
  };

  const handleMfaSuccess = () => {
    setStep('complete');
    setTimeout(() => {
      navigate('/dashboard');
    }, 1200);
  };

  const handleSignUp = (e) => {
    e.preventDefault();
    setSignUpError('');
    setSignUpSuccess(null);

    if (!fullName.trim() || !regEmail.trim() || !phone.trim() || !city.trim() || !regPassword.trim()) {
      setSignUpError('Please fill in all required fields (Name, Email, Phone, City, and Password).');
      return;
    }

    if (!regEmail.includes('@') || !regEmail.includes('.')) {
      setSignUpError('Please provide a valid email address.');
      return;
    }

    if (regPassword.length < 6) {
      setSignUpError('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setSignUpError('Passwords do not match. Please re-enter.');
      return;
    }

    const regResult = registerCustomer({
      fullName,
      email: regEmail,
      phone,
      city,
      dob,
      address,
      password: regPassword,
    });

    if (regResult.success) {
      setSignUpSuccess({
        id: regResult.user.id,
        email: regResult.user.email,
        name: regResult.user.name,
      });
      // Pre-fill Sign In form
      setIdentifier(regResult.user.id);
      setPassword(regPassword);
    }
  };

  return (
    <div className="login">
      <AnimatedBackground />
      <div className="login__card animate-fade-in-scale" style={{ maxWidth: tab === 'signup' ? 520 : 420 }}>
        <div className="login__header">
          <img src={logoImg} alt="FraudX AI" className="login__logo" />
          <h1 className="login__portal-name">{t('login.customerPortal')}</h1>
        </div>

        {/* Tab switch */}
        {step === 'credentials' && (
          <div className="login__tabs">
            <button
              type="button"
              className={`login__tab ${tab === 'signin' ? 'login__tab--active' : ''}`}
              onClick={() => { setTab('signin'); setSignInError(''); }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`login__tab ${tab === 'signup' ? 'login__tab--active' : ''}`}
              onClick={() => { setTab('signup'); setSignUpError(''); setSignUpSuccess(null); }}
            >
              Register Account
            </button>
          </div>
        )}

        {step === 'credentials' && tab === 'signin' ? (
          <form className="login__form animate-fade-in" onSubmit={handleSignIn}>
            <div className="input-group">
              <label className="input-label" htmlFor="customer-id">{t('login.customerId')}</label>
              <input
                id="customer-id"
                className="input"
                type="text"
                placeholder="CUS-100001 or registered email"
                value={identifier}
                onChange={e => { setIdentifier(e.target.value); setSignInError(''); }}
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
                onChange={e => { setPassword(e.target.value); setSignInError(''); }}
              />
            </div>

            {signInError && (
              <div style={{ color: 'var(--risk-high, #EF4444)', fontSize: 'var(--font-size-xs)', padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--border-radius-md)', textAlign: 'center', border: '1px solid rgba(239,68,68,0.2)' }}>
                {signInError}
              </div>
            )}

            <div className="login__options">
              <label className="login__remember">
                <input type="checkbox" defaultChecked /> <span>{t('login.rememberMe')}</span>
              </label>
              <a href="#" className="login__forgot" onClick={(e) => { e.preventDefault(); alert('For account recovery, contact FraudX Support at support@fraudx.ai'); }}>
                {t('login.forgotPassword')}
              </a>
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-full">{t('login.signIn')}</button>

            <div className="login__demo-note" style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Registered Demo Customer</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                ID: CUS-100001 &nbsp;|&nbsp; Password: arjun2024
              </span>
            </div>
          </form>
        ) : (
          <form className="login__form animate-fade-in" onSubmit={handleSignUp}>
            {signUpSuccess ? (
              <div style={{ padding: '16px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 'var(--border-radius-lg)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
                <h3 style={{ margin: '0 0 6px', color: 'var(--risk-low, #22C55E)', fontSize: '1.1rem' }}>Account Registered Successfully!</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>
                  Welcome <strong>{signUpSuccess.name}</strong>. Your account has been registered with ID: <strong style={{ fontFamily: 'var(--font-mono)' }}>{signUpSuccess.id}</strong>.
                </p>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 6, marginBottom: 16 }}>
                  📧 Activation notice: Verification email simulated for <strong>{signUpSuccess.email}</strong>. You can now switch to Sign In with your password.
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
                      placeholder="e.g. Ramesh Patel"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Email Address *</label>
                    <input
                      className="input"
                      type="email"
                      placeholder="ramesh@email.com"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group">
                    <label className="input-label">Phone Number *</label>
                    <input
                      className="input"
                      type="tel"
                      placeholder="+91 98765 00000"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">City / Location *</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="Mumbai / Pune / Delhi"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Residential Address</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Apartment, Street, Area"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group">
                    <label className="input-label">Password *</label>
                    <input
                      className="input"
                      type="password"
                      placeholder="Min 6 characters"
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

                <button type="submit" className="btn btn-primary btn-lg w-full">Complete Registration</button>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center', margin: 0 }}>
                  By registering, your account is enrolled in FraudX AI continuous telemetry protection.
                </p>
              </>
            )}
          </form>
        )}

        {step === 'mfa' && (
          <div>
            <div className="login__step-check" style={{ marginBottom: 16, justifyContent: 'center' }}>
              <span className="login__check">✓</span>
              <span>Credentials verified</span>
            </div>
            <MFAVerification
              userEmail={authenticatedCustomer?.email || 'arjun.mehta@email.com'}
              roleName="Customer"
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
