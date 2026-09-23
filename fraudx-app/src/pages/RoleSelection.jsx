import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AnimatedBackground from '../components/AnimatedBackground';
import logoImg from '../assets/logo.svg';
import './RoleSelection.css';

const ROLE_ICONS = {
  customer: (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="16" r="8"/>
      <path d="M8 42c0-8 7-14 16-14s16 6 16 14"/>
      <path d="M36 14l4 4-4 4" opacity="0.5"/>
    </svg>
  ),
  analyst: (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="20" cy="20" r="14"/>
      <path d="M30 30l10 10"/>
      <path d="M16 16l4 4-2 6 6-2 4 4"/>
    </svg>
  ),
  organisation: (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="16" width="32" height="26" rx="2"/>
      <path d="M16 16V10a8 8 0 0116 0v6"/>
      <path d="M18 28h12M18 34h8"/>
      <circle cx="24" cy="22" r="2"/>
    </svg>
  ),
};

export default function RoleSelection() {
  const [hoveredRole, setHoveredRole] = useState(null);
  const { setSelectedRole } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

  const roles = [
    { key: 'customer', label: t('roles.customer'), desc: t('roles.customerDesc'), path: '/login/customer', color: '#4A7BF7' },
    { key: 'analyst', label: t('roles.analyst'), desc: t('roles.analystDesc'), path: '/login/analyst', color: '#2ECC87' },
    { key: 'organisation', label: t('roles.organisation'), desc: t('roles.organisationDesc'), path: '/login/organisation', color: '#8B5CF6' },
  ];

  const handleSelect = (role) => {
    setSelectedRole(role.key);
    navigate(role.path);
  };

  return (
    <div className="role-selection">
      <AnimatedBackground />
      <div className="role-selection__content">
        <div className="role-selection__header animate-fade-in-up">
          <img src={logoImg} alt="FraudX AI" className="role-selection__logo" />
          <h1 className="role-selection__title">{t('welcome.tagline')}</h1>
          <p className="role-selection__subtitle">{t('welcome.selectRole')}</p>
        </div>

        <div className="role-selection__cards">
          {roles.map((role, idx) => (
            <button
              key={role.key}
              className={`role-card ${hoveredRole === role.key ? 'role-card--hovered' : ''}`}
              style={{ animationDelay: `${idx * 150 + 300}ms`, '--card-accent': role.color }}
              onMouseEnter={() => setHoveredRole(role.key)}
              onMouseLeave={() => setHoveredRole(null)}
              onClick={() => handleSelect(role)}
              aria-label={`Continue as ${role.label}`}
            >
              <div className="role-card__icon" style={{ color: role.color }}>
                {ROLE_ICONS[role.key]}
              </div>
              <h2 className="role-card__title">{role.label}</h2>
              <p className="role-card__desc">{role.desc}</p>
              <span className="role-card__btn">{t('roles.continue')}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="welcome__orb welcome__orb--1" />
      <div className="welcome__orb welcome__orb--2" />
    </div>
  );
}
