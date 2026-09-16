import React from 'react';
import { useTheme } from '../context/ThemeContext';

const THEMES = [
  { key: 'luminous', label: 'Luminous', desc: 'Clean and bright', preview: 'linear-gradient(135deg, #F8FBFF 0%, #FFFFFF 100%)' },
  { key: 'midnight', label: 'Midnight', desc: 'Dark and sleek', preview: 'linear-gradient(135deg, #0B1120 0%, #1E293B 100%)' },
  { key: 'aurora', label: 'Aurora', desc: 'Soft purple tones', preview: 'linear-gradient(135deg, #F5F0FF 0%, #EDE9FE 100%)' },
  { key: 'secure-light', label: 'Secure Light', desc: 'Minimal professional', preview: 'linear-gradient(135deg, #FAFBFC 0%, #F3F5F7 100%)' },
];

export default function Settings() {
  const { theme, setTheme, language, setLanguage, languages, t } = useTheme();

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in-up">
        <div>
          <h1 className="heading-2">⚙️ {t('nav.settings')}</h1>
          <p className="text-secondary">Customize your FraudX AI experience</p>
        </div>
      </div>

      <div className="glass-card animate-fade-in-up" style={{ animationDelay: '100ms', marginBottom: 24 }}>
        <h3 className="text-sm font-semibold" style={{ marginBottom: 16 }}>🎨 Theme</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {THEMES.map(th => (
            <button
              key={th.key}
              onClick={() => setTheme(th.key)}
              style={{
                background: 'var(--bg-card)',
                border: theme === th.key ? '2px solid var(--brand-blue)' : '1px solid var(--border-primary)',
                borderRadius: 'var(--border-radius-md)',
                padding: 12,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'var(--transition-fast)',
              }}
            >
              <div style={{ width: '100%', height: 40, borderRadius: 6, background: th.preview, marginBottom: 8 }} />
              <p className="text-sm font-semibold" style={{ margin: '0 0 2px', color: 'var(--text-primary)' }}>{th.label}</p>
              <p className="text-xs text-tertiary" style={{ margin: 0 }}>{th.desc}</p>
              {theme === th.key && <span className="text-xs" style={{ color: 'var(--brand-blue)', fontWeight: 600 }}>Active</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card animate-fade-in-up" style={{ animationDelay: '200ms', marginBottom: 24 }}>
        <h3 className="text-sm font-semibold" style={{ marginBottom: 16 }}>🌐 Language</h3>
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

      <div className="glass-card animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <h3 className="text-sm font-semibold" style={{ marginBottom: 16 }}>ℹ️ About</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="txn-detail__field"><span className="txn-detail__field-label">Application</span><span className="txn-detail__field-value">FraudX AI</span></div>
          <div className="txn-detail__field"><span className="txn-detail__field-label">Version</span><span className="txn-detail__field-value text-mono">1.0.0-demo</span></div>
          <div className="txn-detail__field"><span className="txn-detail__field-label">Engine</span><span className="txn-detail__field-value">AI Fraud Detection v3</span></div>
          <div className="txn-detail__field"><span className="txn-detail__field-label">Mode</span><span className="txn-detail__field-value">Demo (Simulated Data)</span></div>
        </div>
      </div>
    </div>
  );
}
