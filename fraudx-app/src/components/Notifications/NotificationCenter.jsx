import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import './NotificationCenter.css';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState('all'); // all, fraud, security
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isMuted,
    toggleMute,
    soundEnabled,
  } = useNotifications();

  const isCustomer = user?.role === 'customer';

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filter notifications by tab
  const filtered = notifications.filter(n => {
    if (tab === 'fraud') return n.type === 'fraud';
    if (tab === 'security') return n.type === 'security';
    return true;
  });

  const handleNotificationClick = (notif) => {
    markAsRead(notif.id);
    setIsOpen(false);
    if (notif.type === 'fraud') {
      navigate('/fraud-alerts');
    } else {
      navigate('/security-center');
    }
  };

  return (
    <div className="notif-center" ref={dropdownRef}>
      <button
        type="button"
        className="notif-bell-btn"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notif-dropdown animate-fade-in">
          {/* Header */}
          <div className="notif-header">
            <div className="notif-title-row">
              <h3 className="notif-title">Notifications</h3>
              {unreadCount > 0 && (
                <span className="badge badge-critical" style={{ fontSize: 10, padding: '2px 6px' }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="notif-actions">
              <button
                type="button"
                className="notif-action-btn"
                onClick={toggleMute}
                title={isMuted ? 'Unmute alert sounds' : 'Mute alert sounds'}
              >
                {isMuted ? '🔇 Muted' : '🔔 Audio On'}
              </button>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="notif-action-btn"
                  onClick={markAllAsRead}
                  title="Mark all as read"
                >
                  ✓ Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Role-based category tabs */}
          {!isCustomer && (
            <div className="notif-tabs">
              <button
                type="button"
                className={`notif-tab ${tab === 'all' ? 'notif-tab--active' : ''}`}
                onClick={() => setTab('all')}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                className={`notif-tab ${tab === 'fraud' ? 'notif-tab--active' : ''}`}
                onClick={() => setTab('fraud')}
              >
                🚨 Fraud Alerts
              </button>
              <button
                type="button"
                className={`notif-tab ${tab === 'security' ? 'notif-tab--active' : ''}`}
                onClick={() => setTab('security')}
              >
                🛡️ Security
              </button>
            </div>
          )}

          {/* Notification List */}
          <div className="notif-list">
            {filtered.length > 0 ? (
              filtered.map(notif => (
                <div
                  key={notif.id}
                  className={`notif-item ${!notif.read ? 'notif-item--unread' : ''}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div
                    className={`notif-item-icon ${
                      notif.type === 'fraud' ? 'notif-item-icon--fraud' : 'notif-item-icon--security'
                    }`}
                  >
                    {notif.type === 'fraud' ? '🚨' : '🛡️'}
                  </div>
                  <div className="notif-item-content">
                    <div className="notif-item-header">
                      <span className="notif-item-title">{notif.title}</span>
                      <span className="notif-item-time">{notif.timestamp}</span>
                    </div>
                    <div className="notif-item-reason">{notif.reason}</div>
                    <div className="notif-item-footer">
                      <span className="notif-item-tag">
                        {notif.transactionId || notif.id}
                      </span>
                      <span className={`badge badge-${notif.riskLevel?.toLowerCase() || 'medium'}`}>
                        {notif.riskLevel} Risk
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="notif-empty">
                <div className="notif-empty-icon">✅</div>
                <p style={{ margin: '0 0 4px', fontWeight: 600, color: 'var(--text-primary)' }}>All caught up</p>
                <p style={{ margin: 0, fontSize: 12 }}>No new notifications at this time</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="notif-footer">
            <span style={{ color: 'var(--text-tertiary)' }}>
              {isCustomer ? 'Personal Security Notifications' : 'Enterprise Telemetry Active'}
            </span>
            <button
              type="button"
              className="notif-item-action"
              onClick={() => {
                setIsOpen(false);
                navigate(isCustomer ? '/transactions' : '/fraud-alerts');
              }}
            >
              {isCustomer ? 'View All Transactions →' : 'View Fraud Center →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
