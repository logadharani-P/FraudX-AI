import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useModuleTransition } from '../../context/TransitionContext';
import LogoutFeedbackModal from '../LogoutFeedbackModal';
import logoImg from '../../assets/logo.svg';
import './Sidebar.css';

const NAV_ITEMS = [
  { path: '/dashboard', icon: 'dashboard', labelKey: 'nav.dashboard', roles: ['customer', 'analyst', 'organisation'] },
  { path: '/transactions', icon: 'transactions', labelKey: 'nav.transactions', roles: ['customer', 'analyst', 'organisation'] },
  { path: '/fraud-alerts', icon: 'alerts', labelKey: 'nav.fraudAlerts', roles: ['analyst', 'organisation'] },
  { path: '/security-center', icon: 'security', labelKey: 'nav.securityCenter', roles: ['analyst', 'organisation'] },
  { path: '/members', icon: 'members', labelKey: 'nav.members', roles: ['analyst', 'organisation'] },
  { type: 'divider', roles: ['customer', 'analyst', 'organisation'] },
  { path: '/risk-analysis', icon: 'risk', labelKey: 'nav.riskAnalysis', roles: ['customer', 'analyst', 'organisation'] },
  { path: '/risk-treatment', icon: 'treatment', labelKey: 'nav.riskTreatment', roles: ['analyst', 'organisation'] },
  { type: 'divider', roles: ['customer', 'analyst', 'organisation'] },
  { path: '/ai-agent', icon: 'ai', labelKey: 'nav.aiAgent', roles: ['customer', 'analyst', 'organisation'] },
  { path: '/reports', icon: 'reports', labelKey: 'nav.reports', roles: ['analyst', 'organisation'] },
  { type: 'divider', roles: ['customer', 'analyst', 'organisation'] },
  { path: '/settings', icon: 'settings', labelKey: 'nav.settings', roles: ['customer', 'analyst', 'organisation'] },
];

const ICONS = {
  security: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  ),
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="7" height="8" rx="1.5"/>
      <rect x="11" y="2" width="7" height="5" rx="1.5"/>
      <rect x="2" y="12" width="7" height="6" rx="1.5"/>
      <rect x="11" y="9" width="7" height="9" rx="1.5"/>
    </svg>
  ),
  transactions: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 5h16M2 10h16M2 15h12"/>
      <circle cx="16" cy="15" r="2"/>
    </svg>
  ),
  alerts: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2L18 17H2L10 2z"/>
      <path d="M10 8v4M10 14h.01"/>
    </svg>
  ),
  members: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="3"/>
      <path d="M2 17c0-3 2.5-5 5-5s5 2 5 5"/>
      <circle cx="14" cy="6" r="2.5"/>
      <path d="M14 11c2.5 0 4.5 2 4.5 4.5"/>
    </svg>
  ),
  risk: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="8"/>
      <path d="M10 6v4l3 2"/>
      <path d="M14 3l2 2M6 3L4 5"/>
    </svg>
  ),
  treatment: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10h14M10 3v14"/>
      <rect x="2" y="2" width="16" height="16" rx="3"/>
    </svg>
  ),
  ai: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="3"/>
      <path d="M10 2v3M10 15v3M2 10h3M15 10h3"/>
      <path d="M4.93 4.93l2.12 2.12M12.95 12.95l2.12 2.12M4.93 15.07l2.12-2.12M12.95 7.05l2.12-2.12"/>
    </svg>
  ),
  reports: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2h8l4 4v12a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z"/>
      <path d="M12 2v4h4M7 10h6M7 13h4"/>
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="2.5"/>
      <path d="M16.5 10a6.5 6.5 0 01-.4 2.2l1.6 1.3-1.4 2.4-1.9-.5a6.5 6.5 0 01-1.9 1.1l-.5 2h-2.8l-.5-2a6.5 6.5 0 01-1.9-1.1l-1.9.5-1.4-2.4 1.6-1.3A6.5 6.5 0 013.5 10c0-.8.1-1.5.4-2.2l-1.6-1.3 1.4-2.4 1.9.5A6.5 6.5 0 017.5 3.5l.5-2h2.8l.5 2a6.5 6.5 0 011.9 1.1l1.9-.5 1.4 2.4-1.6 1.3c.3.7.4 1.4.4 2.2z"/>
    </svg>
  ),
  profile: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="7" r="4"/>
      <path d="M3 18c0-3.5 3-6 7-6s7 2.5 7 6"/>
    </svg>
  ),
  logout: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 2h8a2 2 0 012 2v12a2 2 0 01-2 2H7"/>
      <path d="M11 10H2M5 7l-3 3 3 3"/>
    </svg>
  ),
};

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const { t } = useTheme();
  const { navigateWithTransition } = useModuleTransition();
  const navigate = useNavigate();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const userRole = user?.role || 'customer';

  const handleLogoutClick = () => {
    setShowFeedbackModal(true);
  };

  const handleConfirmLogout = () => {
    setShowFeedbackModal(false);
    logout();
    navigate('/');
  };

  const handleNavClick = (e, path) => {
    e.preventDefault();
    onClose();
    navigateWithTransition(path);
  };

  // Filter nav items by role
  const visibleItems = NAV_ITEMS.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  // Remove leading/trailing/consecutive dividers
  const cleanedItems = visibleItems.filter((item, idx, arr) => {
    if (item.type !== 'divider') return true;
    // Remove if first or last
    if (idx === 0 || idx === arr.length - 1) return false;
    // Remove consecutive dividers
    if (arr[idx - 1]?.type === 'divider') return false;
    return true;
  });

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`} role="navigation" aria-label="Main Navigation">
        <div className="sidebar__logo">
          <img src={logoImg} alt="FraudX AI" className="sidebar__logo-img" />
        </div>

        <nav className="sidebar__nav">
          {cleanedItems.map((item, idx) =>
            item.type === 'divider' ? (
              <div key={`d-${idx}`} className="sidebar__divider" />
            ) : (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `sidebar__item ${isActive ? 'sidebar__item--active' : ''}`}
                onClick={(e) => handleNavClick(e, item.path)}
                aria-label={t(item.labelKey)}
              >
                <span className="sidebar__icon">{ICONS[item.icon]}</span>
                <span className="sidebar__label">{t(item.labelKey)}</span>
              </NavLink>
            )
          )}
        </nav>

        <div className="sidebar__footer">
          <NavLink
            to="/profile"
            className={({ isActive }) => `sidebar__item sidebar__profile-item ${isActive ? 'sidebar__item--active' : ''}`}
            onClick={(e) => handleNavClick(e, '/profile')}
          >
            <span className="sidebar__avatar">
              {user?.name?.charAt(0) || 'U'}
            </span>
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{user?.name || 'User'}</span>
              <span className="sidebar__user-role">{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Role'}</span>
            </div>
          </NavLink>
          <button className="sidebar__item sidebar__logout" onClick={handleLogoutClick} aria-label={t('nav.logout')}>
            <span className="sidebar__icon">{ICONS.logout}</span>
            <span className="sidebar__label">{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Logout Feedback Dialog */}
      <LogoutFeedbackModal
        isOpen={showFeedbackModal}
        onConfirmLogout={handleConfirmLogout}
        onCancel={() => setShowFeedbackModal(false)}
      />
    </>
  );
}
