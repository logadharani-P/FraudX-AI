import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

const TransitionContext = createContext(null);

const ROLE_MODULE_TITLES = {
  customer: {
    '/dashboard': 'Opening Dashboard...',
    '/transactions': 'Opening Your Transactions...',
    '/risk-analysis': 'Opening Your Risk Analysis...',
    '/ai-agent': 'Opening AI Agent...',
    '/profile': 'Opening Your Profile...',
    '/settings': 'Opening Settings...',
  },
  analyst: {
    '/dashboard': 'Opening Analyst Dashboard...',
    '/transactions': 'Opening Transaction Monitoring...',
    '/fraud-alerts': 'Opening Fraud Alerts...',
    '/security-center': 'Opening Security Center...',
    '/members': 'Opening Members...',
    '/risk-analysis': 'Opening Risk Analysis...',
    '/risk-treatment': 'Opening Risk Treatment...',
    '/ai-agent': 'Opening AI Investigation Assistant...',
    '/reports': 'Opening Reports...',
    '/profile': 'Opening Analyst Profile...',
    '/settings': 'Opening Settings...',
  },
  organisation: {
    '/dashboard': 'Opening Organisation Dashboard...',
    '/transactions': 'Opening Transactions...',
    '/fraud-alerts': 'Opening Risk Overview...',
    '/security-center': 'Opening Security Center...',
    '/members': 'Opening Members...',
    '/risk-analysis': 'Opening Risk Analysis...',
    '/risk-treatment': 'Opening Risk Management...',
    '/ai-agent': 'Opening AI Assistant...',
    '/reports': 'Opening Reports...',
    '/profile': 'Opening Organisation Profile...',
    '/settings': 'Opening Settings...',
  },
};

const DEFAULT_TITLES = {
  '/dashboard': 'Opening Dashboard...',
  '/transactions': 'Opening Transactions...',
  '/fraud-alerts': 'Opening Fraud Alerts...',
  '/security-center': 'Opening Security Center...',
  '/members': 'Opening Members...',
  '/risk-analysis': 'Opening Risk Analysis...',
  '/risk-treatment': 'Opening Risk Treatment...',
  '/ai-agent': 'Opening AI Assistant...',
  '/reports': 'Opening Reports...',
  '/profile': 'Opening Profile...',
  '/settings': 'Opening Settings...',
};

export function TransitionProvider({ children }) {
  const [transitionState, setTransitionState] = useState({
    active: false,
    phase: 'idle', // 'idle' | 'enter' | 'secure' | 'unlock' | 'release' | 'reveal'
    moduleTitle: '',
    targetPath: '',
    isReducedMotion: false,
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const timeoutRef = useRef([]);

  const clearAllTimeouts = useCallback(() => {
    timeoutRef.current.forEach(t => clearTimeout(t));
    timeoutRef.current = [];
  }, []);

  const getModuleTitle = useCallback((targetPath, customTitle) => {
    if (customTitle) return customTitle;
    const role = user?.role || 'customer';
    const roleMap = ROLE_MODULE_TITLES[role] || ROLE_MODULE_TITLES.customer;
    return roleMap[targetPath] || DEFAULT_TITLES[targetPath] || 'Securing Access...';
  }, [user?.role]);

  const navigateWithTransition = useCallback((toPath, customTitleOrOptions = {}) => {
    // If clicking the current path or empty, don't play animation
    if (!toPath || location.pathname === toPath) return;

    let customTitle = typeof customTitleOrOptions === 'string' ? customTitleOrOptions : customTitleOrOptions?.title;
    let stateData = typeof customTitleOrOptions === 'object' ? customTitleOrOptions?.state : undefined;

    clearAllTimeouts();

    const title = getModuleTitle(toPath, customTitle);

    // Check prefers-reduced-motion or reduced animation setting in DOM
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const docReduced = typeof document !== 'undefined' && (
      document.documentElement.getAttribute('data-animations') === 'reduced' ||
      document.documentElement.getAttribute('data-animations') === 'off'
    );
    const isReduced = prefersReducedMotion || docReduced;

    if (isReduced) {
      // Fast lightweight fade transition
      setTransitionState({
        active: true,
        phase: 'release',
        moduleTitle: title,
        targetPath: toPath,
        isReducedMotion: true,
      });

      const t1 = setTimeout(() => {
        navigate(toPath, { state: stateData });
      }, 120);

      const t2 = setTimeout(() => {
        setTransitionState({
          active: false,
          phase: 'idle',
          moduleTitle: '',
          targetPath: '',
          isReducedMotion: false,
        });
      }, 250);

      timeoutRef.current = [t1, t2];
      return;
    }

    // Normal Full Futuristic Security Lock Transition Sequence (~760ms total)
    // 0ms: Enter (Lock appears in center)
    setTransitionState({
      active: true,
      phase: 'enter',
      moduleTitle: title,
      targetPath: toPath,
      isReducedMotion: false,
    });

    // 180ms: Secure (Authenticating / energy ring scans)
    const tSecure = setTimeout(() => {
      setTransitionState(prev => (prev.active ? { ...prev, phase: 'secure' } : prev));
    }, 180);

    // 380ms: Unlock (Lock visibly opens, Access Granted visual appears)
    const tUnlock = setTimeout(() => {
      setTransitionState(prev => (prev.active ? { ...prev, phase: 'unlock' } : prev));
    }, 380);

    // 600ms: Release (Navigate to target module page)
    const tRelease = setTimeout(() => {
      setTransitionState(prev => (prev.active ? { ...prev, phase: 'release' } : prev));
      navigate(toPath, { state: stateData });
    }, 600);

    // 760ms: Complete transition & clear overlay
    const tComplete = setTimeout(() => {
      setTransitionState({
        active: false,
        phase: 'idle',
        moduleTitle: '',
        targetPath: '',
        isReducedMotion: false,
      });
    }, 760);

    timeoutRef.current = [tSecure, tUnlock, tRelease, tComplete];
  }, [location.pathname, navigate, getModuleTitle, clearAllTimeouts]);

  return (
    <TransitionContext.Provider
      value={{
        transitionState,
        navigateWithTransition,
        getModuleTitle,
      }}
    >
      {children}
    </TransitionContext.Provider>
  );
}

export function useModuleTransition() {
  const context = useContext(TransitionContext);
  if (!context) {
    throw new Error('useModuleTransition must be used within a TransitionProvider');
  }
  return context;
}
