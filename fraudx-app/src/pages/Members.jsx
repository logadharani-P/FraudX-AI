import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';

export default function Members() {
  const { members, people, getTransactionsForMember } = useData();
  const { t } = useTheme();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const memberList = members.length > 0 ? members : people;

  const getCityName = (cityField) => {
    if (!cityField) return t('transactionDetail.notAvailable');
    if (typeof cityField === 'object') return cityField.name || t('transactionDetail.notAvailable');
    return String(cityField);
  };

  const filtered = useMemo(() => {
    if (!search) return memberList;
    const q = search.toLowerCase();
    return memberList.filter(m => {
      const cityName = getCityName(m.city).toLowerCase();
      return (
        m.name?.toLowerCase().includes(q) ||
        m.id?.toString().toLowerCase().includes(q) ||
        m.memberId?.toLowerCase().includes(q) ||
        cityName.includes(q)
      );
    });
  }, [memberList, search]);

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in-up">
        <div>
          <h1 className="heading-2">👥 {t('nav.members')}</h1>
          <p className="text-secondary">{t('members.registeredMembersSubtitle', { count: memberList.length })}</p>
        </div>
      </div>

      <div className="filter-strip animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <input
          className="input"
          type="text"
          placeholder={t('members.search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />
      </div>

      <div className="card-grid animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        {filtered.slice(0, 50).map((member, idx) => {
          const txns = getTransactionsForMember(member.id || member.memberId);
          const memberName = member.name || t('transactionDetail.notAvailable');
          const memberId = member.memberId || member.id || `MBR-${idx + 400001}`;
          const cityName = getCityName(member.city || member.location);

          return (
            <div key={member.id || member.memberId || idx} className="glass-card glass-card--clickable" onClick={() => setSelected(member)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div className="member-avatar">{memberName.charAt(0)}</div>
                <div>
                  <p className="text-sm font-semibold">{memberName}</p>
                  <span className="text-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{memberId}</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-xs text-tertiary">{cityName}</span>
                <span className="text-xs text-tertiary">{t('members.txnsCount', { count: txns.length })}</span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>
            {t('members.noMembersFound')}
          </div>
        )}
      </div>

      {selected && (
        <div className="txn-detail-overlay" onClick={() => setSelected(null)}>
          <div className="txn-detail animate-slide-right" onClick={e => e.stopPropagation()}>
            <div className="txn-detail__header">
              <h2 className="txn-detail__title">{t('members.memberDetails')}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelected(null)} aria-label={t('common.close')}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 4l10 10M14 4L4 14"/>
                </svg>
              </button>
            </div>
            <div className="txn-detail__body">
              <div className="txn-detail__section">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <div className="member-avatar member-avatar--lg">{selected.name?.charAt(0) || 'M'}</div>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 600 }}>{selected.name || t('transactionDetail.notAvailable')}</h3>
                    <span className="text-sm text-tertiary text-mono">{selected.memberId || selected.id || t('transactionDetail.notAvailable')}</span>
                  </div>
                </div>
                <div className="txn-detail__field">
                  <span className="txn-detail__field-label">{t('members.email')}</span>
                  <span className="txn-detail__field-value">{selected.email || t('transactionDetail.notAvailable')}</span>
                </div>
                <div className="txn-detail__field">
                  <span className="txn-detail__field-label">{t('members.phone')}</span>
                  <span className="txn-detail__field-value">{selected.phone || t('transactionDetail.notAvailable')}</span>
                </div>
                <div className="txn-detail__field">
                  <span className="txn-detail__field-label">{t('members.city')}</span>
                  <span className="txn-detail__field-value">{getCityName(selected.city)}</span>
                </div>
                <div className="txn-detail__field">
                  <span className="txn-detail__field-label">{t('members.bankingPartner')}</span>
                  <span className="txn-detail__field-value">{selected.bank || 'FraudX Financial Services'}</span>
                </div>
                <div className="txn-detail__field">
                  <span className="txn-detail__field-label">{t('members.verificationStatus')}</span>
                  <span className="badge badge-low">{t('members.kycVerified')}</span>
                </div>
                <div className="txn-detail__field">
                  <span className="txn-detail__field-label">{t('members.memberSince')}</span>
                  <span className="txn-detail__field-value">{selected.joinDate || 'Jan 2024'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
