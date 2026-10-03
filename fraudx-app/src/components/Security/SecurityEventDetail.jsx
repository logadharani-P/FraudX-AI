import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import './SecurityEventDetail.css';

export default function SecurityEventDetail({ event, onClose }) {
  const { updateSecurityEventStatus } = useNotifications();
  const { t } = useTheme();

  if (!event) return null;

  const handleMarkReviewed = () => {
    updateSecurityEventStatus(event.id, 'Reviewed');
    onClose();
  };

  const getSeverityBadgeClass = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'badge-critical';
      case 'high':
        return 'badge-high';
      case 'medium':
        return 'badge-medium';
      case 'low':
      default:
        return 'badge-low';
    }
  };

  return (
    <div className="sec-detail-overlay" onClick={onClose}>
      <div className="sec-detail animate-slide-right" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sec-detail__header">
          <div>
            <h2 className="sec-detail__title">{t('securityCenter.eventDetail')}</h2>
            <span className="text-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {event.id}
            </span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label={t('common.close')}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l10 10M14 4L4 14" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="sec-detail__body">
          {/* Status & Severity */}
          <div className="sec-detail__card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="text-xs text-tertiary" style={{ display: 'block', marginBottom: 4 }}>
                  {t('securityCenter.severityLevel')}
                </span>
                <span className={`badge ${getSeverityBadgeClass(event.severity)}`}>
                  {t('common.' + (event.severity?.toLowerCase() || 'low'), event.severity)} {t('securityCenter.severity')}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="text-xs text-tertiary" style={{ display: 'block', marginBottom: 4 }}>
                  {t('securityCenter.eventStatus')}
                </span>
                <span className={`badge ${event.status === 'Verified' || event.status === 'Reviewed' ? 'badge-low' : 'badge-high'}`}>
                  {t('common.' + (event.status === 'Reviewed' ? 'completed' : event.status?.toLowerCase()), event.status)}
                </span>
              </div>
            </div>
          </div>

          {/* Event Telemetry */}
          <div className="sec-detail__card">
            <h3 className="sec-detail__card-title">{t('securityCenter.telemetryInfo')}</h3>
            <div className="sec-detail__field">
              <span className="sec-detail__field-label">{t('securityCenter.action')}</span>
              <span className="sec-detail__field-value">{event.action || event.title}</span>
            </div>
            <div className="sec-detail__field">
              <span className="sec-detail__field-label">{t('alerts.category')}</span>
              <span className="sec-detail__field-value" style={{ textTransform: 'capitalize' }}>
                {event.type || 'Security'}
              </span>
            </div>
            <div className="sec-detail__field">
              <span className="sec-detail__field-label">{t('securityCenter.time')}</span>
              <span className="sec-detail__field-value">{event.timestamp} ({event.date})</span>
            </div>
            <div className="sec-detail__field">
              <span className="sec-detail__field-label">{t('securityCenter.user')}</span>
              <span className="sec-detail__field-value">{event.user || 'System Process'}</span>
            </div>
            <div className="sec-detail__field">
              <span className="sec-detail__field-label">{t('securityCenter.assignedRole')}</span>
              <span className="sec-detail__field-value" style={{ textTransform: 'capitalize' }}>
                {event.role || 'Unspecified'}
              </span>
            </div>
          </div>

          {/* Source & Network Verification */}
          <div className="sec-detail__card">
            <h3 className="sec-detail__card-title">{t('transactionDetail.locationSection')}</h3>
            <div className="sec-detail__field">
              <span className="sec-detail__field-label">{t('securityCenter.ipAddress')}</span>
              <span className="sec-detail__field-value text-mono">{event.sourceIp || '127.0.0.1 (Internal)'}</span>
            </div>
            <div className="sec-detail__field">
              <span className="sec-detail__field-label">{t('transactionDetail.deviceSection')}</span>
              <span className="sec-detail__field-value">{event.sourceDevice || 'Internal Services Engine'}</span>
            </div>
          </div>

          {/* Description */}
          <div className="sec-detail__card">
            <h3 className="sec-detail__card-title">{t('securityCenter.auditAction')}</h3>
            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              {event.description || 'Standard security event logged by the FraudX monitoring service.'}
            </p>
          </div>

          {/* Actions */}
          <div className="sec-detail__actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ flex: 1 }}
              onClick={handleMarkReviewed}
            >
              ✓ {t('securityCenter.markReviewed')}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClose}
            >
              {t('securityCenter.closeView')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
