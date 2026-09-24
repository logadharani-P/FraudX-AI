import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import './MFAVerification.css';

export default function MFAVerification({
  email = '',
  challengeId = '',
  sessionId = '',
  roleName = 'Analyst',
  onSuccess,
  onCancel,
}) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [resendTimer, setResendTimer] = useState(30);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRefs = useRef([]);
  const { verifyMfa, resendMfa } = useAuth();
  const { logSecurityEvent } = useNotifications();

  const activeSessionId = sessionId || challengeId;

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleDigitChange = (index, value) => {
    // Check if user pasted a full code
    if (value.length > 1) {
      const cleanDigits = value.replace(/\D/g, '').slice(0, 6).split('');
      if (cleanDigits.length > 0) {
        const newDigits = [...digits];
        cleanDigits.forEach((d, i) => {
          if (index + i < 6) newDigits[index + i] = d;
        });
        setDigits(newDigits);
        setError('');
        setInfoMessage('');
        const nextFocus = Math.min(5, index + cleanDigits.length);
        if (inputRefs.current[nextFocus]) {
          inputRefs.current[nextFocus].focus();
        }
      }
      return;
    }

    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    setError('');
    setInfoMessage('');

    // Auto-focus next input
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0 && inputRefs.current[index - 1]) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1].focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1].focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || isResending) return;
    setIsResending(true);
    setError('');
    setInfoMessage('');

    try {
      await resendMfa({
        session_id: activeSessionId,
        challenge_id: activeSessionId,
        email: email,
      });
      setResendTimer(30);
      setDigits(['', '', '', '', '', '']);
      setInfoMessage('A new verification code has been sent to your email.');
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    } catch (err) {
      setError(err.message || 'Failed to resend verification code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (isVerifying || isSuccess) return;

    const code = digits.join('');

    // Validation: Empty or incomplete code
    if (code.length === 0) {
      setError('Please enter the 6-digit verification code.');
      if (inputRefs.current[0]) inputRefs.current[0].focus();
      return;
    }

    if (code.length < 6) {
      setError(`Incomplete code. Please enter all 6 digits (${code.length}/6 entered).`);
      return;
    }

    setIsVerifying(true);
    setError('');
    setInfoMessage('');

    try {
      const authUser = await verifyMfa({
        session_id: activeSessionId,
        challenge_id: activeSessionId,
        code: code,
        otp: code,
        email: email,
      });

      setIsSuccess(true);
      setIsVerifying(false);
      logSecurityEvent({
        type: 'mfa',
        action: `${roleName} Email Code Verification Succeeded`,
        severity: 'Low',
        role: roleName.toLowerCase(),
        description: `Valid email verification token confirmed for ${roleName} session authentication.`,
      });

      setTimeout(() => {
        if (onSuccess) onSuccess(authUser);
      }, 1000);
    } catch (err) {
      setIsVerifying(false);
      const remaining = attemptsLeft - 1;
      setAttemptsLeft(Math.max(0, remaining));

      logSecurityEvent({
        type: 'mfa',
        action: `${roleName} Email Verification Failed`,
        severity: remaining <= 1 ? 'High' : 'Medium',
        role: roleName.toLowerCase(),
        description: `Invalid verification token attempt (${code}). Attempts remaining: ${remaining}.`,
      });

      const errMsg = err.message || 'Invalid verification code. Please check your email.';
      setError(errMsg);
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    }
  };

  const filledCount = digits.filter(d => d !== '').length;

  return (
    <div className="mfa-container animate-fade-in">
      <div className={`mfa-visual ${isSuccess ? 'mfa-visual--success' : error ? 'mfa-visual--error' : ''}`}>
        <div className="mfa-visual__shield-ring" />
        {isSuccess ? (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        )}
      </div>

      <h2 className="mfa-title">
        {isSuccess ? 'Verification Succeeded' : 'Email Verification'}
      </h2>
      <p className="mfa-desc">
        {isSuccess
          ? 'Security credentials verified. Initializing secure workspace...'
          : email
            ? <span>Enter the 6-digit verification code sent to <strong style={{ color: 'var(--brand-blue, #60A5FA)' }}>{email}</strong>.</span>
            : 'Enter the 6-digit verification code sent to your registered email address.'}
      </p>

      {!isSuccess && (
        <form onSubmit={handleVerify} style={{ width: '100%' }}>
          <div className="mfa-progress">
            <div className="mfa-progress-bar" style={{ width: `${(filledCount / 6) * 100}%` }} />
          </div>

          <div className="mfa-digits">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <input
                key={i}
                ref={el => (inputRefs.current[i] = el)}
                className={`mfa-digit-input ${error ? 'has-error' : ''}`}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                disabled={isVerifying || attemptsLeft <= 0}
                value={digits[i]}
                onChange={e => handleDigitChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>

          {infoMessage && !error && (
            <div className="animate-fade-in" style={{ color: 'var(--brand-green, #10B981)', fontSize: 'var(--font-size-xs)', padding: '8px 12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--border-radius-md)', textAlign: 'center', marginBottom: 12 }}>
              ✓ {infoMessage}
            </div>
          )}

          {error && (
            <div className="mfa-error-box animate-fade-in" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="mfa-resend-row">
            <span>Didn't receive code?</span>
            <button
              type="button"
              className="mfa-resend-btn"
              onClick={handleResend}
              disabled={resendTimer > 0 || attemptsLeft <= 0 || isResending}
            >
              {isResending ? 'Sending...' : resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend Code'}
            </button>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={isVerifying || attemptsLeft <= 0 || filledCount === 0}
            style={{ marginTop: 8 }}
          >
            {isVerifying ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className="login__access-spinner" style={{ width: 14, height: 14 }} />
                Verifying Code...
              </span>
            ) : (
              'Verify & Continue'
            )}
          </button>

          {onCancel && (
            <button
              type="button"
              className="btn btn-ghost btn-sm w-full"
              onClick={onCancel}
              style={{ marginTop: 8 }}
            >
              Back to Sign In
            </button>
          )}
        </form>
      )}

      {isSuccess && (
        <div className="login__complete animate-fade-in" style={{ padding: '8px 0' }}>
          <div className="login__step-check">
            <span className="login__check">✓</span>
            <span>Verification code confirmed</span>
          </div>
          <div className="login__access-msg">
            <div className="login__access-spinner" />
            <span>Establishing encrypted session...</span>
          </div>
        </div>
      )}
    </div>
  );
}
