import React from 'react';
import { useModuleTransition } from '../../context/TransitionContext';
import './ModuleTransition.css';

/**
 * ModuleAccessTransition
 * Unified reusable security lock transition for FraudX AI.
 * Displays: Secure Access -> Authentication -> Module Opened (Access Granted)
 * Respects prefers-reduced-motion and application theme.
 */
export default function ModuleAccessTransition() {
  const { transitionState } = useModuleTransition();
  const { active, phase, moduleTitle, isReducedMotion } = transitionState;

  if (!active) return null;

  // Minimal fade fallback for reduced motion preference
  if (isReducedMotion) {
    return (
      <div className="module-transition-overlay module-transition-overlay--reduced" role="status" aria-live="polite">
        <div className="module-transition-reduced-badge">
          <span className="module-transition-reduced-dot" />
          <span>{moduleTitle || 'Opening Module...'}</span>
        </div>
      </div>
    );
  }

  const isUnlocked = phase === 'unlock' || phase === 'release';

  return (
    <div
      className={`module-transition-overlay module-transition-overlay--${phase}`}
      role="status"
      aria-live="polite"
      aria-label={moduleTitle || 'Authenticating secure access'}
    >
      {/* Subtle depth lighting */}
      <div className="module-transition-ambient">
        <div className="module-transition-blob module-transition-blob--blue" />
        <div className="module-transition-blob module-transition-blob--cyan" />
      </div>

      <div className="module-transition-container">
        {/* Subtle Orbital Authentication Ring */}
        <div className={`module-transition-ring-wrapper ${phase}`}>
          <div className="module-transition-ring module-transition-ring--outer" />
          <div className="module-transition-ring module-transition-ring--inner" />
        </div>

        {/* Security Lock Core */}
        <div className={`module-transition-lock-wrapper ${isUnlocked ? 'unlocked' : 'locked'}`}>
          <svg
            className="module-transition-lock-svg"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="mLockBody" x1="20" y1="45" x2="80" y2="95" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#1E293B" />
                <stop offset="100%" stopColor="#0B132B" />
              </linearGradient>

              <linearGradient id="mLockBorder" x1="20" y1="45" x2="80" y2="95" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#4A7BF7" />
                <stop offset="100%" stopColor={isUnlocked ? '#10B981' : '#22D3EE'} />
              </linearGradient>

              <linearGradient id="mShackleGrad" x1="32" y1="16" x2="68" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={isUnlocked ? '#34D399' : '#60A5FA'} />
                <stop offset="100%" stopColor={isUnlocked ? '#10B981' : '#22D3EE'} />
              </linearGradient>
            </defs>

            {/* Shackle: translates upward and rotates when unlocked */}
            <g className="lock-shackle-group">
              <path
                className="lock-shackle"
                d="M34 46 V 30 C 34 21.16 41.16 14 50 14 C 58.84 14 66 21.16 66 30 V 46"
                stroke="url(#mShackleGrad)"
                strokeWidth="6"
                strokeLinecap="round"
              />
            </g>

            {/* Lock Body */}
            <rect
              className="lock-body"
              x="24"
              y="44"
              width="52"
              height="44"
              rx="10"
              fill="url(#mLockBody)"
              stroke="url(#mLockBorder)"
              strokeWidth="2.5"
            />

            {/* Keyhole and Energy Status Core */}
            <circle
              className="lock-keyhole-top"
              cx="50"
              cy="62"
              r="4.5"
              fill={isUnlocked ? '#10B981' : '#38BDF8'}
            />
            <path
              className="lock-keyhole-stem"
              d="M47.5 64 L46 72 H54 L52.5 64 Z"
              fill={isUnlocked ? '#10B981' : '#38BDF8'}
            />

            {/* Center Unlock Glow Dot */}
            <circle
              cx="50"
              cy="62"
              r="2"
              fill="#FFFFFF"
              className={isUnlocked ? 'core-pulse-active' : ''}
            />
          </svg>
        </div>

        {/* Security Clearance Badge: AUTHENTICATING -> ACCESS GRANTED */}
        <div className={`module-transition-badge ${isUnlocked ? 'module-transition-badge--granted' : ''}`}>
          <div className="module-transition-security-tag">
            <span className={`security-pulse-dot ${isUnlocked ? 'granted' : ''}`} />
            <span className="security-text">
              {isUnlocked ? 'ACCESS GRANTED' : 'AUTHENTICATING ACCESS'}
            </span>
          </div>

          <h2 className="module-transition-title">
            {moduleTitle || 'Opening Module...'}
          </h2>
        </div>
      </div>
    </div>
  );
}

// Named alias
export { ModuleAccessTransition };
