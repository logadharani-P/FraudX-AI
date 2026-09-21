import React, { createContext, useContext, useState, useMemo } from 'react';

const AuthContext = createContext(null);

const DEMO_USERS = {
  customer: {
    id: 'CUS-100001',
    name: 'Arjun Sharma',
    email: 'arjun.sharma@email.com',
    role: 'customer',
    organisation: 'FraudX Financial Services',
    phone: '+91 98765 43210',
    avatar: null,
    accountId: 'ACC-8839201940',
    joinDate: 'January 2024',
    verified: true,
    city: 'Mumbai',
  },
  analyst: {
    id: 'ANL-200001',
    name: 'Priya Iyer',
    email: 'priya.iyer@fraudx.ai',
    role: 'analyst',
    organisation: 'FraudX AI Security Division',
    phone: '+91 87654 32109',
    avatar: null,
    analystId: 'ANL-200001',
    specialization: 'Transaction Fraud & Anomaly Detection',
    casesInvestigated: 142,
    joinDate: 'March 2023',
    verified: true,
    clearanceLevel: 'Level 3',
    city: 'Chennai',
  },
  organisation: {
    id: 'ORG-300001',
    name: 'Vikram Mehta',
    email: 'vikram.mehta@fraudx.ai',
    role: 'organisation',
    organisation: 'FraudX AI',
    phone: '+91 76543 21098',
    avatar: null,
    orgId: 'ORG-300001',
    designation: 'Chief Security Officer',
    joinDate: 'June 2022',
    verified: true,
    city: 'Delhi',
  },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = (role) => {
    const demoUser = DEMO_USERS[role];
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('fraudx_welcomed_' + (demoUser?.id || role));
      sessionStorage.removeItem('fraudx_welcomed_customer');
    }
    setUser(demoUser);
    setSelectedRole(role);
    setIsAuthenticated(true);
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      if (user?.id) {
        sessionStorage.removeItem('fraudx_welcomed_' + user.id);
      }
      sessionStorage.removeItem('fraudx_welcomed_customer');
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
    setUser(null);
    setSelectedRole(null);
    setIsAuthenticated(false);
  };

  const value = useMemo(() => ({
    user,
    selectedRole,
    isAuthenticated,
    login,
    logout,
    setSelectedRole,
  }), [user, selectedRole, isAuthenticated]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
