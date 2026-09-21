import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import './Profile.css';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const { transactions, members } = useData();
  const { language, setLanguage, theme, setTheme } = useTheme();

  const [isEditing, setIsEditing] = useState(false);
  const [phoneInput, setPhoneInput] = useState(() => user?.phone || '');
  const [cityInput, setCityInput] = useState(() => user?.city || '');
  const [addressInput, setAddressInput] = useState(() => user?.address || '');
  const [specializationInput, setSpecializationInput] = useState(() => user?.specialization || '');
  const [langInput, setLangInput] = useState(() => user?.language || language || 'en');
  const [themeInput, setThemeInput] = useState(() => user?.theme || theme || 'luminous');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editError, setEditError] = useState('');

  // Find customer's member entry for transaction stats
  const customerMember = useMemo(() => {
    if (user?.role !== 'customer' || !user?.name) return null;
    return members.find(m => m.name?.toLowerCase() === user.name.toLowerCase());
  }, [user, members]);

  const customerTxns = useMemo(() => {
    if (!customerMember) return [];
    const memberId = customerMember.id ?? customerMember.memberId;
    return transactions.filter(t => t.senderId === memberId || t.receiverId === memberId);
  }, [customerMember, transactions]);

  if (!user) return null;

  const role = user.role || 'customer';
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'FX';

  const handleOpenEdit = () => {
    setPhoneInput(user.phone || '');
    setCityInput(user.city || '');
    setAddressInput(user.address || '');
    setSpecializationInput(user.specialization || '');
    setLangInput(user.language || language || 'en');
    setThemeInput(user.theme || theme || 'luminous');
    setEditError('');
    setIsEditing(true);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setEditError('');

    if (!phoneInput.trim()) {
      setEditError('Phone number cannot be empty.');
      return;
    }
    if (!cityInput.trim()) {
      setEditError('City / Location cannot be empty.');
      return;
    }

    setIsSaving(true);

    setTimeout(() => {
      const result = updateProfile({
        phone: phoneInput.trim(),
        city: cityInput.trim(),
        address: addressInput.trim(),
        specialization: specializationInput.trim(),
        language: langInput,
        theme: themeInput,
      });

      if (langInput !== language) {
        setLanguage(langInput);
      }
      if (themeInput !== theme) {
        setTheme(themeInput);
      }

      setIsSaving(false);
      if (result.success) {
        setSaveSuccess(true);
        setIsEditing(false);
        setTimeout(() => setSaveSuccess(false), 3500);
      } else {
        setEditError(result.error || 'Failed to update profile.');
      }
    }, 450);
  };

  // Role-specific about summary
  const aboutText = useMemo(() => {
    if (role === 'customer') {
      return `Verified FraudX AI banking member since ${user.joinDate || '2024'}. Account protected by continuous real-time anomaly detection, adaptive multi-factor authorization, and zero-liability fraud guarantees.`;
    }
    if (role === 'analyst') {
      return `Senior Financial Crime Analyst at ${user.organisation || 'FraudX AI Security Division'}. Authorized for Level-3 investigation workflows, anomaly triage, risk treatment application, and graph correlation.`;
    }
    return `Chief Security Administrator at ${user.organisation || 'FraudX AI'}. Authorized for organization-wide security telemetry, policy governance, member oversight, and compliance auditing.`;
  }, [role, user]);

  return (
    <div className="page-container profile-page">
      {/* 1. TOP HERO SECTION: Centered Large Circular Avatar & Profile Header */}
      <div className="profile-hero animate-fade-in-up">
        <div className="profile-hero__avatar-container">
          <div className="profile-hero__avatar-glow" />
          <div className="profile-hero__avatar-ring" />
          <div className="profile-hero__avatar">
            <span className="profile-hero__initials">{initials}</span>
          </div>
        </div>

        <h1 className="profile-hero__name">{user.name || 'Authenticated User'}</h1>
        <p className="profile-hero__email">{user.email || 'user@fraudx.ai'}</p>

        <div className="profile-hero__badges">
          <span className="badge badge-info">{roleLabel} Portal</span>
          <span className="badge badge-info text-mono">ID: {user.id || user.analystId || user.orgId}</span>
          <span className="badge badge-low">● Active & Protected</span>
          <span className="badge badge-info">{user.city || 'India'}</span>
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleOpenEdit}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span>✏️</span>
            <span>Edit Profile</span>
          </button>
        </div>

        {saveSuccess && (
          <div className="animate-fade-in" style={{ marginTop: 12, display: 'inline-block', padding: '6px 16px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22C55E', borderRadius: 20, color: '#22C55E', fontSize: '0.82rem', fontWeight: 600 }}>
            ✓ Profile details updated and saved successfully
          </div>
        )}
      </div>

      {/* Sequential Reveal Sections */}
      <div className="profile-sections-flow">
        {/* Section 1: About */}
        <div className="profile-card animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="profile-card__header">
            <span className="profile-card__icon">📝</span>
            <h3 className="profile-card__title">Profile Summary</h3>
          </div>
          <p className="profile-card__text">{aboutText}</p>
        </div>

        {/* Section 2: Personal Information */}
        <div className="profile-card animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <div className="profile-card__header">
            <span className="profile-card__icon">👤</span>
            <h3 className="profile-card__title">Personal Information</h3>
          </div>
          <div className="profile-grid">
            <div className="profile-item">
              <span className="profile-item__label">Full Name</span>
              <span className="profile-item__value font-semibold">{user.name || 'Not available'}</span>
              <span className="text-xs text-tertiary" style={{ marginTop: 2 }}>🔒 Verified Identity</span>
            </div>
            <div className="profile-item">
              <span className="profile-item__label">Email Address</span>
              <span className="profile-item__value">{user.email || 'Not available'}</span>
              <span className="text-xs text-tertiary" style={{ marginTop: 2 }}>🔒 Primary Account Email</span>
            </div>
            <div className="profile-item">
              <span className="profile-item__label">Phone Number</span>
              <span className="profile-item__value">{user.phone || 'Not available'}</span>
            </div>
            <div className="profile-item">
              <span className="profile-item__label">City / Location</span>
              <span className="profile-item__value">{user.city || 'Not available'}</span>
            </div>
            <div className="profile-item">
              <span className="profile-item__label">Member Since</span>
              <span className="profile-item__value">{user.joinDate || 'Not available'}</span>
            </div>
            <div className="profile-item">
              <span className="profile-item__label">Account Status</span>
              <span className="profile-item__value" style={{ color: 'var(--risk-low, #22C55E)' }}>● Active & Protected</span>
            </div>
          </div>
        </div>

        {/* Section 3: Role & Organisation Information */}
        <div className="profile-card animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="profile-card__header">
            <span className="profile-card__icon">🏢</span>
            <h3 className="profile-card__title">
              {role === 'customer' ? 'Account & Banking Details' : 'Organisation & Role Credentials'}
            </h3>
          </div>
          <div className="profile-grid">
            {role === 'customer' && (
              <>
                <div className="profile-item">
                  <span className="profile-item__label">Customer ID (Immutable)</span>
                  <span className="profile-item__value text-mono font-semibold">{user.id || 'Not available'}</span>
                  <span className="text-xs text-tertiary" style={{ marginTop: 2 }}>🔒 Protected Identity Field</span>
                </div>
                <div className="profile-item">
                  <span className="profile-item__label">Linked Account ID</span>
                  <span className="profile-item__value text-mono">{user.accountId || 'ACC-8839201940'}</span>
                  <span className="text-xs text-tertiary" style={{ marginTop: 2 }}>🔒 Protected Core Account</span>
                </div>
                <div className="profile-item">
                  <span className="profile-item__label">Primary Banking Partner</span>
                  <span className="profile-item__value">{user.organisation || 'FraudX Financial Services'}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-item__label">Recorded Transfers</span>
                  <span className="profile-item__value font-semibold">{customerTxns.length} transfers monitored</span>
                </div>
              </>
            )}

            {role === 'analyst' && (
              <>
                <div className="profile-item">
                  <span className="profile-item__label">Analyst ID</span>
                  <span className="profile-item__value text-mono font-semibold">{user.analystId || user.id}</span>
                  <span className="text-xs text-tertiary" style={{ marginTop: 2 }}>🔒 Clearance ID</span>
                </div>
                <div className="profile-item">
                  <span className="profile-item__label">Security Division</span>
                  <span className="profile-item__value">{user.organisation || 'FraudX AI Security Division'}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-item__label">Specialization</span>
                  <span className="profile-item__value">{user.specialization || 'Transaction Fraud & Anomaly Detection'}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-item__label">Clearance Level</span>
                  <span className="profile-item__value badge badge-info">{user.clearanceLevel || 'Level 3'}</span>
                </div>
              </>
            )}

            {role === 'organisation' && (
              <>
                <div className="profile-item">
                  <span className="profile-item__label">Organisation ID</span>
                  <span className="profile-item__value text-mono font-semibold">{user.orgId || user.id}</span>
                  <span className="text-xs text-tertiary" style={{ marginTop: 2 }}>🔒 Corporate Identifier</span>
                </div>
                <div className="profile-item">
                  <span className="profile-item__label">Organisation Name</span>
                  <span className="profile-item__value">{user.organisation || 'FraudX AI'}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-item__label">Administrative Designation</span>
                  <span className="profile-item__value">{user.designation || 'Chief Security Officer'}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-item__label">Governance Scope</span>
                  <span className="profile-item__value badge badge-info">Enterprise Full Access</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section 4: Security & Safeguards */}
        <div className="profile-card animate-fade-in-up" style={{ animationDelay: '250ms' }}>
          <div className="profile-card__header">
            <span className="profile-card__icon">🔐</span>
            <h3 className="profile-card__title">Security Status & Safeguards</h3>
          </div>
          <div className="profile-grid">
            <div className="profile-item">
              <span className="profile-item__label">Multi-Factor Authentication (MFA)</span>
              <span className="badge badge-low">✓ Enforced (Level 2)</span>
            </div>
            <div className="profile-item">
              <span className="profile-item__label">Identity KYC Verification</span>
              <span className="badge badge-low">✓ Aadhaar / PAN Verified</span>
            </div>
            <div className="profile-item">
              <span className="profile-item__label">Active Session Token</span>
              <span className="profile-item__value text-mono">SEC-SES-9820 (This Device)</span>
            </div>
            <div className="profile-item">
              <span className="profile-item__label">Real-Time Threat Telemetry</span>
              <span className="badge badge-low">● Active</span>
            </div>
          </div>
        </div>

        {/* Section 5: Recent Activity Log */}
        <div className="profile-card animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="profile-card__header">
            <span className="profile-card__icon">⏱️</span>
            <h3 className="profile-card__title">Recent Activity</h3>
          </div>
          <div className="profile-timeline-list">
            <div className="profile-timeline-row">
              <span className="profile-timeline-dot" />
              <div className="profile-timeline-info">
                <span className="profile-timeline-action">Primary Authentication Succeeded</span>
                <span className="profile-timeline-time">Today • Registered Security Session</span>
              </div>
            </div>
            <div className="profile-timeline-row">
              <span className="profile-timeline-dot" />
              <div className="profile-timeline-info">
                <span className="profile-timeline-action">MFA Security Token Verified</span>
                <span className="profile-timeline-time">Today • 6-Digit OTP Matched</span>
              </div>
            </div>
            <div className="profile-timeline-row">
              <span className="profile-timeline-dot" />
              <div className="profile-timeline-info">
                <span className="profile-timeline-action">
                  {role === 'customer' ? 'Account Stream Synchronized' : 'Telemetry Monitoring Stream Active'}
                </span>
                <span className="profile-timeline-time">Today • FraudX AI Engine</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Workspace Preferences */}
        <div className="profile-card animate-fade-in-up" style={{ animationDelay: '350ms' }}>
          <div className="profile-card__header">
            <span className="profile-card__icon">⚙️</span>
            <h3 className="profile-card__title">Preferences</h3>
          </div>
          <div className="profile-grid">
            <div className="profile-item">
              <span className="profile-item__label">Language</span>
              <span className="profile-item__value" style={{ textTransform: 'uppercase' }}>{user.language || language || 'en'}</span>
            </div>
            <div className="profile-item">
              <span className="profile-item__label">Visual Theme</span>
              <span className="profile-item__value" style={{ textTransform: 'capitalize' }}>{user.theme || theme || 'luminous'}</span>
            </div>
            <div className="profile-item">
              <span className="profile-item__label">Audio Voice Agent</span>
              <span className="profile-item__value" style={{ color: '#22C55E' }}>● Active</span>
            </div>
            <div className="profile-item">
              <span className="profile-item__label">In-App Alerts</span>
              <span className="profile-item__value">Subscribed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 10, 20, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16,
        }}>
          <div className="glass-card animate-fade-in-scale" style={{
            maxWidth: 500,
            width: '100%',
            background: 'var(--bg-card, #121826)',
            border: '1px solid var(--border-primary, rgba(255,255,255,0.1))',
            borderRadius: 'var(--border-radius-xl, 16px)',
            padding: 24,
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.2rem' }}>✏️</span>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Edit Profile Information</h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setIsEditing(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Protected Notice */}
              <div style={{ padding: '8px 12px', background: 'rgba(74, 123, 247, 0.1)', border: '1px solid rgba(74, 123, 247, 0.25)', borderRadius: 8, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                🔒 <strong>Identity Protection:</strong> Account Name, Role, Unique IDs, and KYC status cannot be modified via client interface.
              </div>

              <div className="input-group">
                <label className="input-label">Phone Number *</label>
                <input
                  className="input"
                  type="tel"
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>

              <div className="input-group">
                <label className="input-label">City / Location *</label>
                <input
                  className="input"
                  type="text"
                  value={cityInput}
                  onChange={e => setCityInput(e.target.value)}
                  placeholder="Mumbai, Delhi, Chennai, etc."
                />
              </div>

              {role === 'customer' && (
                <div className="input-group">
                  <label className="input-label">Residential Address</label>
                  <input
                    className="input"
                    type="text"
                    value={addressInput}
                    onChange={e => setAddressInput(e.target.value)}
                    placeholder="Address details"
                  />
                </div>
              )}

              {role === 'analyst' && (
                <div className="input-group">
                  <label className="input-label">Investigation Specialization</label>
                  <input
                    className="input"
                    type="text"
                    value={specializationInput}
                    onChange={e => setSpecializationInput(e.target.value)}
                    placeholder="e.g. Transaction Fraud & Anomaly Detection"
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">Language</label>
                  <select
                    className="input"
                    value={langInput}
                    onChange={e => setLangInput(e.target.value)}
                  >
                    <option value="en">English (EN)</option>
                    <option value="hi">हिन्दी (HI)</option>
                    <option value="ta">தமிழ் (TA)</option>
                    <option value="te">తెలుగు (TE)</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Visual Theme</label>
                  <select
                    className="input"
                    value={themeInput}
                    onChange={e => setThemeInput(e.target.value)}
                  >
                    <option value="luminous">Luminous (Light)</option>
                    <option value="dark">Dark Neural</option>
                  </select>
                </div>
              </div>

              {editError && (
                <div style={{ color: 'var(--risk-high, #EF4444)', fontSize: '0.75rem', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 6, textAlign: 'center' }}>
                  {editError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving Changes...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
