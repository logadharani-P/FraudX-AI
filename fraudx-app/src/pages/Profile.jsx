import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';

export default function Profile() {
  const { user } = useAuth();
  const { transactions, members } = useData();
  const { t } = useTheme();

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

  const roleLabel = user.role?.charAt(0).toUpperCase() + user.role?.slice(1);

  // Build fields based on role
  let fields = [];

  if (user.role === 'customer') {
    fields = [
      { label: 'Full Name', value: user.name },
      { label: 'Email', value: user.email },
      { label: 'Phone', value: user.phone },
      { label: 'Role', value: roleLabel },
      { label: 'Customer ID', value: user.id },
      { label: 'Account ID', value: user.accountId },
      { label: 'Organisation', value: user.organisation },
      { label: 'City', value: user.city },
      { label: 'Joined', value: user.joinDate },
      { label: 'Total Transactions', value: customerTxns.length },
      { label: 'Total Amount', value: customerTxns.length > 0 ? `₹${customerTxns.reduce((s, t) => s + t.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0.00' },
    ];
  } else if (user.role === 'analyst') {
    fields = [
      { label: 'Full Name', value: user.name },
      { label: 'Email', value: user.email },
      { label: 'Phone', value: user.phone },
      { label: 'Role', value: roleLabel },
      { label: 'Analyst ID', value: user.analystId },
      { label: 'Organisation', value: user.organisation },
      { label: 'City', value: user.city },
      { label: 'Joined', value: user.joinDate },
      { label: 'Specialization', value: user.specialization },
      { label: 'Cases Investigated', value: user.casesInvestigated },
      { label: 'Clearance Level', value: user.clearanceLevel },
    ];
  } else if (user.role === 'organisation') {
    fields = [
      { label: 'Administrator', value: user.name },
      { label: 'Email', value: user.email },
      { label: 'Phone', value: user.phone },
      { label: 'Role', value: roleLabel },
      { label: 'Organisation ID', value: user.orgId },
      { label: 'Organisation Name', value: user.organisation },
      { label: 'City', value: user.city },
      { label: 'Joined', value: user.joinDate },
      { label: 'Designation', value: user.designation },
    ];
  }

  // Filter out empty/undefined values
  fields = fields.filter(f => f.value !== undefined && f.value !== null && f.value !== '');

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
              <span className="badge badge-info">{roleLabel}</span>
              {user.verified && <span className="badge badge-low">✓ Verified</span>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {fields.map((f, i) => (
            <div key={i} className="txn-detail__field">
              <span className="txn-detail__field-label">{f.label}</span>
              <span className="txn-detail__field-value">{f.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Personal Security Overview Card */}
      <div className="glass-card animate-fade-in-up" style={{ animationDelay: '200ms', maxWidth: 600, marginTop: 20 }}>
        <h3 className="heading-3" style={{ marginBottom: 4 }}>🛡️ Account Security Status</h3>
        <p className="text-secondary text-xs" style={{ marginBottom: 16 }}>Your personal security protections and authentication safeguards</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="txn-detail__field">
            <span className="txn-detail__field-label">Multi-Factor Authentication (MFA)</span>
            <span className="badge badge-low">✓ Enabled (Level 2)</span>
          </div>
          <div className="txn-detail__field">
            <span className="txn-detail__field-label">Account Verification</span>
            <span className="badge badge-low">✓ KYC Verified</span>
          </div>
          <div className="txn-detail__field">
            <span className="txn-detail__field-label">Recent Login Activity</span>
            <span className="txn-detail__field-value text-mono">Today at 10:42 AM (Authorized Device)</span>
          </div>
          <div className="txn-detail__field">
            <span className="txn-detail__field-label">Real-Time Security Notifications</span>
            <span className="badge badge-low">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
