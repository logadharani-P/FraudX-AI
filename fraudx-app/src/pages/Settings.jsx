import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const THEMES = [
  { key: 'luminous', label: 'Luminous', desc: 'Clean and bright', preview: 'linear-gradient(135deg, #F8FBFF 0%, #FFFFFF 100%)' },
  { key: 'midnight', label: 'Midnight', desc: 'Dark and sleek', preview: 'linear-gradient(135deg, #0B1120 0%, #1E293B 100%)' },
  { key: 'aurora', label: 'Aurora', desc: 'Soft purple tones', preview: 'linear-gradient(135deg, #F5F0FF 0%, #EDE9FE 100%)' },
  { key: 'secure-light', label: 'Secure Light', desc: 'Minimal professional', preview: 'linear-gradient(135deg, #FAFBFC 0%, #F3F5F7 100%)' },
  { key: 'high-contrast', label: 'High Contrast', desc: 'Ultra-accessible dark', preview: 'linear-gradient(135deg, #000000 0%, #181818 100%)' },
  { key: 'system', label: 'System Default', desc: 'Matches device settings', preview: 'linear-gradient(135deg, #E2E8F0 0%, #64748B 100%)' },
];

const ACCENTS = [
  { key: 'blue', label: 'Brand Blue', color: '#4A7BF7' },
  { key: 'cyan', label: 'Cyber Cyan', color: '#06B6D4' },
  { key: 'violet', label: 'Electric Violet', color: '#8B5CF6' },
  { key: 'green', label: 'Emerald Mint', color: '#10B981' },
];

export default function Settings() {
  const {
    theme,
    setTheme,
    accent,
    setAccent,
    animations,
    setAnimations,
    density,
    setDensity,
    fontSize,
    setFontSize,
    highContrast,
    setHighContrast,
    language,
    setLanguage,
    languages,
    t,
  } = useTheme();

  const {
    soundEnabled,
    setSoundEnabled,
    criticalSoundEnabled,
    setCriticalSoundEnabled,
    channels,
    setChannels,
    categories,
    setCategories,
    playNotificationSound,
    playCriticalAlertSound,
  } = useNotifications();

  const { user } = useAuth();
  const isCustomer = user?.role === 'customer';

  const toggleChannel = (key) => {
    setChannels(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCategory = (key) => {
    setCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="page-container" style={{ maxWidth: 960 }}>
      {/* Header */}
      <div className="page-header animate-fade-in-up">
        <div>
          <h1 className="heading-2">⚙️ {t('nav.settings')}</h1>
          <p className="text-secondary">Customize visual themes, notification channels, accessibility, and security controls</p>
        </div>
      </div>

      {/* 1. Appearance */}
      <div className="glass-card animate-fade-in-up" style={{ animationDelay: '100ms', marginBottom: 24 }}>
        <h3 className="heading-3" style={{ marginBottom: 4 }}>🎨 Appearance & Theme</h3>
        <p className="text-secondary text-xs" style={{ marginBottom: 18 }}>Select your preferred workspace theme and color accents</p>

        {/* Theme Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
          {THEMES.map(th => (
            <button
              key={th.key}
              onClick={() => {
                setTheme(th.key);
                if (th.key === 'high-contrast') setHighContrast(true);
                else setHighContrast(false);
              }}
              style={{
                background: 'var(--bg-card)',
                border: (theme === th.key || (th.key === 'high-contrast' && highContrast)) ? '2px solid var(--brand-blue)' : '1px solid var(--border-primary)',
                borderRadius: 'var(--border-radius-md)',
                padding: 12,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'var(--transition-fast)',
              }}
            >
              <div style={{ width: '100%', height: 36, borderRadius: 6, background: th.preview, marginBottom: 8, border: '1px solid var(--border-secondary)' }} />
              <p className="text-sm font-semibold" style={{ margin: '0 0 2px', color: 'var(--text-primary)' }}>{th.label}</p>
              <p className="text-xs text-tertiary" style={{ margin: 0 }}>{th.desc}</p>
              {(theme === th.key || (th.key === 'high-contrast' && highContrast)) && (
                <span className="text-xs font-semibold" style={{ color: 'var(--brand-blue)', display: 'inline-block', marginTop: 4 }}>✓ Active</span>
              )}
            </button>
          ))}
        </div>

        {/* Accent Color Picker */}
        <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-secondary)' }}>
          <label className="text-xs font-semibold text-secondary" style={{ display: 'block', marginBottom: 10 }}>Accent Color</label>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {ACCENTS.map(acc => (
              <button
                key={acc.key}
                type="button"
                onClick={() => setAccent(acc.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  borderRadius: 'var(--border-radius-md)',
                  background: 'var(--bg-card)',
                  border: accent === acc.key ? `2px solid ${acc.color}` : '1px solid var(--border-primary)',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                }}
              >
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: acc.color, display: 'inline-block' }} />
                <span>{acc.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Animation & Density Settings */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-secondary)' }}>
          <div>
            <label className="text-xs font-semibold text-secondary" style={{ display: 'block', marginBottom: 8 }}>Animation Intensity</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {['full', 'reduced', 'off'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  className={`btn btn-xs ${animations === opt ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ textTransform: 'capitalize' }}
                  onClick={() => setAnimations(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-secondary" style={{ display: 'block', marginBottom: 8 }}>UI Density</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {['comfortable', 'compact'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  className={`btn btn-xs ${density === opt ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ textTransform: 'capitalize' }}
                  onClick={() => setDensity(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Accessibility & Sound */}
      <div className="glass-card animate-fade-in-up" style={{ animationDelay: '150ms', marginBottom: 24 }}>
        <h3 className="heading-3" style={{ marginBottom: 4 }}>♿ Accessibility & Audio</h3>
        <p className="text-secondary text-xs" style={{ marginBottom: 18 }}>Audio feedback and readability preferences</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {/* Font Scale */}
          <div className="sec-detail__card" style={{ background: 'var(--bg-card)' }}>
            <span className="text-xs font-semibold text-secondary" style={{ display: 'block', marginBottom: 8 }}>Font Scaling</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {['small', 'default', 'large'].map(sz => (
                <button
                  key={sz}
                  type="button"
                  className={`btn btn-xs ${fontSize === sz ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ textTransform: 'capitalize' }}
                  onClick={() => setFontSize(sz)}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {/* Sound Controls */}
          <div className="sec-detail__card" style={{ background: 'var(--bg-card)' }}>
            <span className="text-xs font-semibold text-secondary" style={{ display: 'block', marginBottom: 8 }}>Notification Sound Feedback</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-xs">Standard Notification Chime</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button type="button" className="btn btn-ghost btn-xs" onClick={playNotificationSound}>Test</button>
                  <button
                    type="button"
                    className={`btn btn-xs ${soundEnabled ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setSoundEnabled(prev => !prev)}
                  >
                    {soundEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-xs">Critical Security Alert Sound</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button type="button" className="btn btn-ghost btn-xs" onClick={playCriticalAlertSound}>Test</button>
                  <button
                    type="button"
                    className={`btn btn-xs ${criticalSoundEnabled ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setCriticalSoundEnabled(prev => !prev)}
                  >
                    {criticalSoundEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Notification Preferences (Channels & Categories) */}
      <div className="glass-card animate-fade-in-up" style={{ animationDelay: '200ms', marginBottom: 24 }}>
        <h3 className="heading-3" style={{ marginBottom: 4 }}>📬 Notification Preferences</h3>
        <p className="text-secondary text-xs" style={{ marginBottom: 18 }}>Configure alert delivery channels and event categories</p>

        {/* Channels */}
        <div style={{ marginBottom: 20 }}>
          <label className="text-xs font-semibold text-secondary" style={{ display: 'block', marginBottom: 10 }}>Delivery Channels</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* In-App */}
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 'var(--border-radius-md)', cursor: 'pointer' }}>
              <div>
                <span className="text-sm font-semibold" style={{ display: 'block' }}>In-App Notifications & Banner</span>
                <span className="text-xs text-secondary">Real-time alert notifications inside the FraudX console</span>
              </div>
              <input
                type="checkbox"
                checked={channels.inApp}
                onChange={() => toggleChannel('inApp')}
                style={{ width: 18, height: 18, accentColor: 'var(--brand-blue)' }}
              />
            </label>

            {/* Email */}
            <div style={{ padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-secondary)', borderRadius: 'var(--border-radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.85 }}>
              <div>
                <span className="text-sm font-semibold" style={{ display: 'block' }}>Email Notifications</span>
                <span className="text-xs text-tertiary">Email notifications are not configured for this environment.</span>
              </div>
              <span className="badge badge-info" style={{ fontSize: 10 }}>Not Configured</span>
            </div>

            {/* SMS */}
            <div style={{ padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-secondary)', borderRadius: 'var(--border-radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.85 }}>
              <div>
                <span className="text-sm font-semibold" style={{ display: 'block' }}>SMS Notifications</span>
                <span className="text-xs text-tertiary">SMS notifications are not configured for this environment.</span>
              </div>
              <span className="badge badge-info" style={{ fontSize: 10 }}>Not Configured</span>
            </div>

            {/* Push */}
            <div style={{ padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-secondary)', borderRadius: 'var(--border-radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.85 }}>
              <div>
                <span className="text-sm font-semibold" style={{ display: 'block' }}>Push Notifications</span>
                <span className="text-xs text-tertiary">Push notifications are not configured for this environment.</span>
              </div>
              <span className="badge badge-info" style={{ fontSize: 10 }}>Not Configured</span>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-secondary)' }}>
          <label className="text-xs font-semibold text-secondary" style={{ display: 'block', marginBottom: 10 }}>Alert Categories</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
            {[
              { key: 'criticalFraud', label: 'Critical Fraud Alerts' },
              { key: 'highRiskTxn', label: 'High-Risk Transactions' },
              { key: 'securityAlerts', label: 'Security & Auth Alerts' },
              { key: 'loginAlerts', label: 'Login & Session Alerts' },
              { key: 'mfaAlerts', label: 'MFA Verification Alerts' },
              { key: 'systemNotifications', label: 'System Notifications' },
              { key: 'investigationUpdates', label: 'Investigation Updates' },
            ].map(cat => (
              <label
                key={cat.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-secondary)',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={!!categories[cat.key]}
                  onChange={() => toggleCategory(cat.key)}
                  style={{ accentColor: 'var(--brand-blue)' }}
                />
                <span>{cat.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Privacy & Security */}
      <div className="glass-card animate-fade-in-up" style={{ animationDelay: '250ms', marginBottom: 24 }}>
        <h3 className="heading-3" style={{ marginBottom: 4 }}>🔒 Privacy & Security Status</h3>
        <p className="text-secondary text-xs" style={{ marginBottom: 18 }}>Multi-factor authentication status and active device telemetry</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="txn-detail__field">
            <span className="txn-detail__field-label">Multi-Factor Authentication (MFA)</span>
            <span className="badge badge-low">✓ Level-2 Enforced</span>
          </div>
          <div className="txn-detail__field">
            <span className="txn-detail__field-label">Current Active Session</span>
            <span className="txn-detail__field-value text-mono">SEC-SES-9820 (This Device)</span>
          </div>
          <div className="txn-detail__field">
            <span className="txn-detail__field-label">Last Successful Authentication</span>
            <span className="txn-detail__field-value">2026-09-20 • Verified MFA</span>
          </div>
          <div className="txn-detail__field">
            <span className="txn-detail__field-label">Distributed Remote Session Termination</span>
            <span className="text-xs text-tertiary">Requires distributed Redis backend session store (not connected in prototype).</span>
          </div>
        </div>
      </div>

      {/* 5. Language */}
      <div className="glass-card animate-fade-in-up" style={{ animationDelay: '300ms', marginBottom: 24 }}>
        <h3 className="heading-3" style={{ marginBottom: 4 }}>🌐 Language</h3>
        <p className="text-secondary text-xs" style={{ marginBottom: 16 }}>Choose your preferred interface language</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(languages).map(([key, label]) => (
            <button
              key={key}
              className={`btn btn-sm ${language === key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setLanguage(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 6. About */}
      <div className="glass-card animate-fade-in-up" style={{ animationDelay: '350ms' }}>
        <h3 className="heading-3" style={{ marginBottom: 16 }}>ℹ️ About FraudX AI</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="txn-detail__field"><span className="txn-detail__field-label">Application</span><span className="txn-detail__field-value font-semibold">FraudX AI Enterprise Console</span></div>
          <div className="txn-detail__field"><span className="txn-detail__field-label">Version</span><span className="txn-detail__field-value text-mono">v2.4.0-release</span></div>
          <div className="txn-detail__field"><span className="txn-detail__field-label">Engine</span><span className="txn-detail__field-value">AI Anomaly Engine + Web Audio Synthesizer</span></div>
          <div className="txn-detail__field"><span className="txn-detail__field-label">Environment</span><span className="txn-detail__field-value">Autonomous Real-Time Client Evaluation</span></div>
        </div>
      </div>
    </div>
  );
}

