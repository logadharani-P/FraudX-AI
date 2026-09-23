import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import AnimatedBackground from '../AnimatedBackground';
import NotificationCenter from '../Notifications/NotificationCenter';
import ModuleAccessTransition from '../Security/ModuleAccessTransition';
import { useAuth } from '../../context/AuthContext';
import { useModuleTransition } from '../../context/TransitionContext';
import './AppShell.css';

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { navigateWithTransition } = useModuleTransition();
  const location = useLocation();

  const roleTitle = user?.role === 'customer'
    ? 'Customer Portal'
    : user?.role === 'analyst'
    ? 'Fraud Intelligence Console'
    : 'Organisation Security Portal';

  return (
    <div className="app-shell">
      <AnimatedBackground />
      <ModuleAccessTransition />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="app-shell__content">
        <header className="app-shell__header">
          <div className="app-shell__header-left">
            <button
              className="app-shell__menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 6h16M3 11h16M3 16h16" />
              </svg>
            </button>
            <div className="app-shell__portal-tag">
              <span className="app-shell__portal-dot" />
              <span>{roleTitle}</span>
            </div>
          </div>

          <div className="app-shell__header-right">
            {/* Top Navigation Notification Center */}
            <NotificationCenter />

            {/* Quick Profile Link */}
            <button
              type="button"
              onClick={() => navigateWithTransition('/profile')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-primary)',
                padding: '4px 10px 4px 6px',
                borderRadius: 'var(--border-radius-full)',
                cursor: 'pointer',
              }}
              title="View Profile"
            >
              <span className="member-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                {user?.name?.charAt(0) || 'U'}
              </span>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                {user?.name?.split(' ')[0] || 'Account'}
              </span>
            </button>
          </div>
        </header>

        <div key={location.pathname} className="app-shell__page module-page-reveal">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
