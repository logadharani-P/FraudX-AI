import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Profile() {
  const { user } = useAuth();
  const { t } = useTheme();

  if (!user) return null;

  const fields = [
    { label: 'Full Name', value: user.name },
    { label: 'Email', value: user.email },
    { label: 'Phone', value: user.phone },
    { label: 'Role', value: user.role?.charAt(0).toUpperCase() + user.role?.slice(1) },
    { label: 'Organisation', value: user.organisation },
    { label: 'City', value: user.city },
    { label: 'Joined', value: user.joinDate },
    ...(user.role === 'analyst' ? [
      { label: 'Analyst ID', value: user.analystId },
      { label: 'Specialization', value: user.specialization },
      { label: 'Cases Investigated', value: user.casesInvestigated },
      { label: 'Clearance Level', value: user.clearanceLevel },
    ] : []),
    ...(user.role === 'organisation' ? [
      { label: 'Organisation ID', value: user.orgId },
      { label: 'Designation', value: user.designation },
    ] : []),
    ...(user.role === 'customer' ? [
      { label: 'Customer ID', value: user.id },
      { label: 'Account ID', value: user.accountId },
    ] : []),
  ];

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in-up">
        <div>
          <h1 className="heading-2">👤 Profile</h1>
          <p className="text-secondary">Your account information</p>
        </div>
      </div>

      <div className="glass-card animate-fade-in-up" style={{ animationDelay: '100ms', maxWidth: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border-primary)' }}>
          <div className="member-avatar member-avatar--xl">{user.name?.charAt(0)}</div>
          <div>
            <h2 style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 'var(--font-size-xl)' }}>{user.name}</h2>
            <p className="text-sm text-secondary" style={{ margin: 0 }}>{user.email}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <span className="badge badge-info">{user.role}</span>
              {user.verified && <span className="badge badge-low">✓ Verified</span>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {fields.map((f, i) => (
            <div key={i} className="txn-detail__field">
              <span className="txn-detail__field-label">{f.label}</span>
              <span className="txn-detail__field-value">{f.value || '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
