import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import AnimatedBackground from '../AnimatedBackground';
import './AppShell.css';

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <AnimatedBackground />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="app-shell__content">
        <header className="app-shell__header">
          <button
            className="app-shell__menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h16M3 11h16M3 16h16"/>
            </svg>
          </button>
        </header>
        <div className="app-shell__page">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
