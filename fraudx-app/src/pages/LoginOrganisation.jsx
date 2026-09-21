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
  const [tab, setTab] = useState('signin'); // 'signin' or 'signup'
  const [step, setStep] = useState('credentials');
  
  // Sign In state
  const [orgId, setOrgId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Sign Up state
  const [regOrgName, setRegOrgName] = useState('');
  const [regOrgId, setRegOrgId] = useState('');
  const [regAdminName, setRegAdminName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDesignation, setRegDesignation] = useState('Chief Risk Officer');
  const [regCity, setRegCity] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [signUpError, setSignUpError] = useState('');
  const [signUpSuccess, setSignUpSuccess] = useState(null);

  const { authenticate, registerOrganisation } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

  const handleCredentials = (e) => {
    e.preventDefault();
    setError('');

    if (!orgId.trim() || !email.trim() || !password.trim()) {
      setError('Please enter Organisation ID, admin email, and password.');
      return;
    }

    // Verify credentials
    const authResult = authenticate('organisation', { orgId, email, password });
    if (!authResult.success) {
      setError(authResult.error || 'Invalid organisation administrator credentials.');
      return;
    }

    setStep('mfa');
  };

  const handleOrgRegister = (e) => {
    e.preventDefault();
    setSignUpError('');
    setSignUpSuccess(null);

    if (!regOrgName.trim() || !regOrgId.trim() || !regAdminName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setSignUpError('Please fill in Organisation Name, Org ID, Admin Name, Corporate Email, and Password.');
      return;
    }

    if (!regEmail.includes('@')) {
      setSignUpError('Please enter a valid corporate email.');
      return;
    }

    if (regPassword.length < 6) {
      setSignUpError('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setSignUpError('Passwords do not match.');
      return;
    }

    const regRes = registerOrganisation({
      orgName: regOrgName,
      orgId: regOrgId,
      adminName: regAdminName,
      email: regEmail,
      phone: regPhone,
      designation: regDesignation,
      city: regCity,
      password: regPassword,
    });

    if (regRes.success) {
      setSignUpSuccess({
        orgName: regRes.user.organisation,
        orgId: regRes.user.orgId,
        adminName: regRes.user.name,
        email: regRes.user.email,
      });
      setOrgId(regRes.user.orgId);
      setEmail(regRes.user.email);
      setPassword(regPassword);
    }
  };

  const handleMfaSuccess = () => {
    setStep('complete');
    setTimeout(() => {
      navigate('/dashboard');
    }, 1200);
  };

  return (
    <div className="login">
      <AnimatedBackground />
      <div className="login__card animate-fade-in-scale" style={{ maxWidth: tab === 'signup' ? 520 : 420 }}>
        <div className="login__header">
          <img src={logoImg} alt="FraudX AI" className="login__logo" />
          <h1 className="login__portal-name">{t('login.orgPortal')}</h1>
        </div>

        {step === 'credentials' && (
          <div className="login__tabs">
            <button
              type="button"
              className={`login__tab ${tab === 'signin' ? 'login__tab--active' : ''}`}
              onClick={() => { setTab('signin'); setError(''); }}
            >
              Admin Sign In
            </button>
            <button
              type="button"
              className={`login__tab ${tab === 'signup' ? 'login__tab--active' : ''}`}
              onClick={() => { setTab('signup'); setSignUpError(''); setSignUpSuccess(null); }}
            >
              Enrol Organisation
            </button>
          </div>
        )}

        {step === 'credentials' && tab === 'signin' && (
          <form className="login__form animate-fade-in" onSubmit={handleCredentials}>
            <div className="input-group">
              <label className="input-label" htmlFor="org-id">{t('login.orgId')}</label>
              <input id="org-id" className="input" type="text" placeholder="ORG-300001" value={orgId} onChange={e => { setOrgId(e.target.value); setError(''); }} />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="org-email">{t('login.adminEmail')}</label>
              <input id="org-email" className="input" type="email" placeholder="vikram.mehta@fraudx.ai" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="org-pwd">{t('login.password')}</label>
              <input id="org-pwd" className="input" type="password" placeholder="••••••••" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} />
            </div>
            {error && (
              <div style={{ color: 'var(--risk-high, #EF4444)', fontSize: 'var(--font-size-xs)', padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--border-radius-md)', textAlign: 'center', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-lg w-full">{t('login.signIn')}</button>
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <span className="text-xs text-tertiary" style={{ fontFamily: 'var(--font-mono)' }}>
                Registered Demo — ID: ORG-300001 | Email: vikram.mehta@fraudx.ai | Password: fraudx2024
              </span>
            </div>
          </form>
        )}

        {step === 'credentials' && tab === 'signup' && (
          <form className="login__form animate-fade-in" onSubmit={handleOrgRegister}>
            {signUpSuccess ? (
              <div style={{ padding: '16px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 'var(--border-radius-lg)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🏢</div>
                <h3 style={{ margin: '0 0 6px', color: 'var(--risk-low, #22C55E)', fontSize: '1.1rem' }}>Organisation Registered!</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>
                  <strong>{signUpSuccess.orgName}</strong> ({signUpSuccess.orgId}) enrolled under administrator <strong>{signUpSuccess.adminName}</strong>.
                </p>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 6, marginBottom: 16 }}>
                  🔐 Enrolment active for local session. You can now proceed to Organisation Sign In.
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
                    <label className="input-label">Organisation Name *</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="e.g. Apex Bank Corp"
                      value={regOrgName}
                      onChange={e => setRegOrgName(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Organisation ID *</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="ORG-300999"
                      value={regOrgId}
                      onChange={e => setRegOrgId(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group">
                    <label className="input-label">Admin Full Name *</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="e.g. Meera Reddy"
                      value={regAdminName}
                      onChange={e => setRegAdminName(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Corporate Email *</label>
                    <input
                      className="input"
                      type="email"
                      placeholder="admin@apexbank.com"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group">
                    <label className="input-label">Administrative Role</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="Chief Security Officer"
                      value={regDesignation}
                      onChange={e => setRegDesignation(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Headquarters / City</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="Delhi / Mumbai"
                      value={regCity}
                      onChange={e => setRegCity(e.target.value)}
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

                <button type="submit" className="btn btn-primary btn-lg w-full">Enrol Enterprise Organisation</button>
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
