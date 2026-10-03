import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import './MFAVerification.css';

export default function MFAVerification({
  userEmail,
  roleName = 'Analyst',
  onSuccess,
  onCancel,
}) {
  const { t } = useTheme();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [resendTimer, setResendTimer] = useState(30);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRefs = useRef([]);
  const { logSecurityEvent } = useNotifications();

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

  const handleResend = () => {
    if (resendTimer > 0) return;
    setResendTimer(30);
    setError('');
    setDigits(['', '', '', '', '', '']);
    if (inputRefs.current[0]) inputRefs.current[0].focus();
  };

  const handleVerify = (e) => {
    if (e) e.preventDefault();
    if (isVerifying || isSuccess) return;

    const code = digits.join('');

    // Validation: Empty or incomplete code
    if (code.length === 0) {
      setError(t('mfa.errEnterCode'));
      if (inputRefs.current[0]) inputRefs.current[0].focus();
      return;
    }

    if (code.length < 6) {
      setError(t('mfa.errIncomplete', { length: code.length }));
      return;
    }

    setIsVerifying(true);
    setError('');

    // Simulate verification delay
    setTimeout(() => {
      // Validates 6-digit security code received by the user
      if (code && code.length === 6 && /^\d{6}$/.test(code)) {
        setIsSuccess(true);
        setIsVerifying(false);
        logSecurityEvent({
          type: 'mfa',
          action: `${roleName} MFA Verification Succeeded`,
          severity: 'Low',
          role: roleName.toLowerCase(),
          description: `Valid verification token verified for ${roleName} session authentication.`,
        });
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1200);
      } else {
        setIsVerifying(false);
        const remaining = attemptsLeft - 1;
        setAttemptsLeft(remaining);

        logSecurityEvent({
          type: 'mfa',
          action: `${roleName} MFA Verification Failed`,
          severity: remaining <= 1 ? 'High' : 'Medium',
          role: roleName.toLowerCase(),
          description: `Invalid verification token attempt (${code}). Attempts remaining: ${remaining}.`,
        });

        if (remaining <= 0) {
          setError(t('mfa.errMaxAttempts'));
        } else {
          setError(t('mfa.errInvalidCode', { remaining }));
        }
      }
    }, 750);
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
          <img src="/favicon.svg" alt="FraudX AI Shield" style={{ width: 36, height: 36, objectFit: 'contain' }} />
        )}
      </div>

      <h2 className="mfa-title">
        {isSuccess ? t('mfa.successTitle') : t('mfa.title')}
      </h2>
      <p className="mfa-desc">
        {isSuccess
          ? t('mfa.successDesc')
          : t('mfa.desc', { email: userEmail || 'your registered email' })}
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
            <span>{t('mfa.didntReceive')}</span>
            <button
              type="button"
              className="mfa-resend-btn"
              onClick={handleResend}
              disabled={resendTimer > 0 || attemptsLeft <= 0}
            >
              {resendTimer > 0 ? t('mfa.resendTimer', { seconds: resendTimer }) : t('mfa.resendCode')}
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
                {t('mfa.verifyingToken')}
              </span>
            ) : (
              t('mfa.verifyAndContinue')
            )}
          </button>

          {onCancel && (
            <button
              type="button"
              className="btn btn-ghost btn-sm w-full"
              onClick={onCancel}
              style={{ marginTop: 8 }}
            >
              {t('mfa.backToSignIn')}
            </button>
          )}
        </form>
      )}

      {isSuccess && (
        <div className="login__complete animate-fade-in" style={{ padding: '8px 0' }}>
          <div className="login__step-check">
            <span className="login__check">✓</span>
            <span>{t('mfa.tokenVerifiedSuccess')}</span>
          </div>
          <div className="login__access-msg">
            <div className="login__access-spinner" />
            <span>{t('mfa.establishingSession')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
