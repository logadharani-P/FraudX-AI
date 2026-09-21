import React, { useState } from 'react';

const LOGOUT_REASONS = [
  'Finished using the app',
  'Need to return later',
  'Testing the application',
  'Could not find what I needed',
  'Issue with the application',
  'Other',
];

export default function LogoutFeedbackModal({ isOpen, onConfirmLogout, onCancel }) {
  const [rating, setRating] = useState(5);
  const [selectedReason, setSelectedReason] = useState('Finished using the app');
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Persist temporary session feedback to localStorage without pretending server storage
    try {
      const feedbackEntry = {
        rating,
        reason: selectedReason,
        comments: feedbackText.trim(),
        timestamp: new Date().toISOString(),
      };
      const existing = JSON.parse(localStorage.getItem('fraudx-session-feedback') || '[]');
      existing.push(feedbackEntry);
      localStorage.setItem('fraudx-session-feedback', JSON.stringify(existing.slice(-20)));
    } catch {
      // safe fallback
    }

    setTimeout(() => {
      setIsSubmitting(false);
      onConfirmLogout();
    }, 400);
  };

  const handleSkip = () => {
    onConfirmLogout();
  };

  return (
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
        maxWidth: 460,
        width: '100%',
        background: 'var(--bg-card, #121826)',
        border: '1px solid var(--border-primary, rgba(255,255,255,0.1))',
        borderRadius: 'var(--border-radius-xl, 16px)',
        padding: 24,
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: '2.2rem', marginBottom: 6 }}>👋</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary, #F8FAFC)' }}>
            Before you go
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #94A3B8)', margin: 0 }}>
            How was your FraudX AI experience today?
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Star Rating */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.6rem',
                  cursor: 'pointer',
                  transform: rating >= star ? 'scale(1.15)' : 'scale(1)',
                  transition: 'transform 0.15s ease',
                  padding: 2,
                  filter: rating >= star ? 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.5))' : 'grayscale(100%) opacity(30%)',
                }}
              >
                ⭐
              </button>
            ))}
          </div>

          {/* Reason Selection */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', marginBottom: 8 }}>
              Why are you logging out?
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {LOGOUT_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSelectedReason(reason)}
                  style={{
                    padding: '8px 10px',
                    fontSize: '0.75rem',
                    textAlign: 'left',
                    borderRadius: 8,
                    cursor: 'pointer',
                    border: selectedReason === reason ? '1px solid var(--brand-blue, #4A7BF7)' : '1px solid var(--border-primary, rgba(255,255,255,0.08))',
                    background: selectedReason === reason ? 'rgba(74, 123, 247, 0.15)' : 'var(--bg-secondary, rgba(255,255,255,0.03))',
                    color: selectedReason === reason ? 'var(--brand-blue, #4A7BF7)' : 'var(--text-secondary, #CBD5E1)',
                    fontWeight: selectedReason === reason ? 600 : 400,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Text feedback */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', marginBottom: 6 }}>
              Additional feedback (Optional)
            </label>
            <textarea
              className="input"
              rows={2}
              placeholder="Tell us what went well or what we can improve..."
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              style={{ width: '100%', fontSize: '0.8rem', resize: 'none', padding: '8px 12px' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleSkip}
              style={{ color: 'var(--text-tertiary, #94A3B8)' }}
            >
              Skip & Logout
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Logging out...' : 'Submit & Logout'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
