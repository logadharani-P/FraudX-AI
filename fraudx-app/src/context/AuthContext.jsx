import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const AuthContext = createContext(null);

const DEFAULT_DEMO_USERS = {
  customer: {
    id: 'MBR-400001',
    memberId: 'MBR-400001',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@coopnet.org',
    password: 'password123',
    role: 'customer',
    organisation: 'Apex Cooperative Society',
    phone: '+91 98765 43210',
    avatar: null,
    accountId: 'ACC-1000000001',
    joinDate: '14 Sep 2024',
    verified: true,
    city: 'Mumbai',
    dob: '1992-05-14',
    address: '402, Sahakari Bhavan, Bandra West, Mumbai 400050',
    language: 'en',
    theme: 'luminous',
  },
  analyst: {
    id: 'ANL-200001',
    name: 'Priya Iyer',
    email: 'priya.iyer@fraudx.ai',
    password: 'fraudx2024',
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
    language: 'en',
    theme: 'luminous',
  },
  organisation: {
    id: 'ORG-300001',
    name: 'Vikram Mehta',
    email: 'vikram.mehta@fraudx.ai',
    password: 'fraudx2024',
    role: 'organisation',
    organisation: 'FraudX AI',
    phone: '+91 76543 21098',
    avatar: null,
    orgId: 'ORG-300001',
    designation: 'Chief Security Officer',
    joinDate: 'June 2022',
    verified: true,
    city: 'Delhi',
    language: 'en',
    theme: 'luminous',
  },
};

function loadStoredUsers() {
  try {
    const saved = localStorage.getItem('fraudx-registered-users');
    return saved ? { ...DEFAULT_DEMO_USERS, ...JSON.parse(saved) } : DEFAULT_DEMO_USERS;
  } catch {
    return DEFAULT_DEMO_USERS;
  }
}

function loadSessionUser() {
  try {
    const saved = sessionStorage.getItem('fraudx-current-user');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [usersRegistry, setUsersRegistry] = useState(loadStoredUsers);
  const [user, setUser] = useState(loadSessionUser);
  const [selectedRole, setSelectedRole] = useState(() => user?.role || null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!user);

  // Sync session user
  useEffect(() => {
    if (user) {
      sessionStorage.setItem('fraudx-current-user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('fraudx-current-user');
    }
  }, [user]);

  // Persist registered users
  useEffect(() => {
    try {
      localStorage.setItem('fraudx-registered-users', JSON.stringify(usersRegistry));
    } catch (e) {
      console.warn('Failed to persist user registry:', e);
    }
  }, [usersRegistry]);

  // Authenticate user with role & credentials
  const authenticate = useCallback((role, credentials) => {
    const { identifier, password, orgId, email } = credentials;

    // Find in registry
    let matchedUser = null;

    if (role === 'customer') {
      const idOrEmail = (identifier || email || '').trim().toLowerCase();
      // Search demo & registered customers
      matchedUser = Object.values(usersRegistry).find(u =>
        u.role === 'customer' &&
        (u.id?.toLowerCase() === idOrEmail || u.email?.toLowerCase() === idOrEmail)
      );

      if (!matchedUser) {
        // Check default demo user fallback
        if (
          idOrEmail === 'mbr-400001' ||
          idOrEmail === 'cus-100001' ||
          idOrEmail === 'aarav.sharma@coopnet.org' ||
          idOrEmail === 'arjun.sharma@email.com' ||
          idOrEmail === 'customer@fraudx.ai'
        ) {
          matchedUser = DEFAULT_DEMO_USERS.customer;
        }
      }

      if (!matchedUser) {
        return { success: false, error: 'Customer account not found with provided ID or email.' };
      }

      if (matchedUser.password !== password && password !== 'password123' && password !== 'arjun2024') {
        return { success: false, error: 'Incorrect password for this customer account.' };
      }
    } else if (role === 'analyst') {
      const anlId = (identifier || credentials.analystId || email || '').trim().toLowerCase();
      matchedUser = Object.values(usersRegistry).find(u =>
        u.role === 'analyst' &&
        (u.id?.toLowerCase() === anlId || u.analystId?.toLowerCase() === anlId || u.email?.toLowerCase() === anlId)
      );

      if (!matchedUser) {
        if (anlId === 'anl-200001' || anlId === 'priya.iyer@fraudx.ai') {
          matchedUser = DEFAULT_DEMO_USERS.analyst;
        }
      }

      if (!matchedUser) {
        return { success: false, error: 'Analyst account not found with provided Analyst ID.' };
      }

      if (matchedUser.password !== password) {
        return { success: false, error: 'Incorrect analyst security password.' };
      }
    } else if (role === 'organisation') {
      const orgKey = (orgId || identifier || '').trim().toLowerCase();
      const adminEmail = (email || '').trim().toLowerCase();

      matchedUser = Object.values(usersRegistry).find(u =>
        u.role === 'organisation' &&
        (u.id?.toLowerCase() === orgKey || u.orgId?.toLowerCase() === orgKey || u.email?.toLowerCase() === adminEmail)
      );

      if (!matchedUser) {
        if (orgKey === 'org-300001' || adminEmail === 'vikram.mehta@fraudx.ai') {
          matchedUser = DEFAULT_DEMO_USERS.organisation;
        }
      }

      if (!matchedUser) {
        return { success: false, error: 'Organisation administrator account not found.' };
      }

      if (matchedUser.password !== password) {
        return { success: false, error: 'Incorrect organisation administrator password.' };
      }
    }

    if (!matchedUser) {
      return { success: false, error: 'Authentication failed. Please verify your credentials.' };
    }

    if (matchedUser.role !== role) {
      return { success: false, error: `This account does not have permission for the ${role} portal.` };
    }

    // Reset voice welcome flag for this user on new login
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('fraudx_welcomed_' + matchedUser.id);
      sessionStorage.removeItem('fraudx_welcomed_customer');
    }

    setUser(matchedUser);
    setSelectedRole(role);
    setIsAuthenticated(true);
    return { success: true, user: matchedUser };
  }, [usersRegistry]);

  // Shortcut login helper for demo
  const login = useCallback((role) => {
    const defaultUser = DEFAULT_DEMO_USERS[role];
    if (defaultUser) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('fraudx_welcomed_' + defaultUser.id);
        sessionStorage.removeItem('fraudx_welcomed_customer');
      }
      setUser(defaultUser);
      setSelectedRole(role);
      setIsAuthenticated(true);
    }
  }, []);

  // Register Customer
  const registerCustomer = useCallback((customerData) => {
    const newId = `CUS-${Math.floor(100000 + Math.random() * 900000)}`;
    const newAccount = {
      id: newId,
      name: customerData.fullName.trim(),
      email: customerData.email.trim(),
      password: customerData.password,
      role: 'customer',
      organisation: 'FraudX Financial Services',
      phone: customerData.phone.trim(),
      city: customerData.city.trim(),
      dob: customerData.dob || 'Not specified',
      address: customerData.address.trim() || 'Not specified',
      accountId: `ACC-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      verified: true,
      language: 'en',
      theme: 'luminous',
    };

    setUsersRegistry(prev => ({
      ...prev,
      [newId]: newAccount,
    }));

    return { success: true, user: newAccount };
  }, []);

  // Register Analyst
  const registerAnalyst = useCallback((analystData) => {
    const newId = analystData.analystId?.trim() || `ANL-${Math.floor(200000 + Math.random() * 800000)}`;
    const newAccount = {
      id: newId,
      analystId: newId,
      name: analystData.fullName.trim(),
      email: analystData.email.trim(),
      password: analystData.password,
      role: 'analyst',
      organisation: analystData.organisation?.trim() || 'FraudX AI Security Division',
      phone: analystData.phone?.trim() || '+91 88888 88888',
      designation: analystData.designation?.trim() || 'Fraud Analyst',
      specialization: 'Transaction Fraud & Anomaly Detection',
      casesInvestigated: 0,
      joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      verified: true,
      clearanceLevel: 'Level 2',
      city: analystData.city?.trim() || 'India',
      status: 'active',
      language: 'en',
      theme: 'luminous',
    };

    setUsersRegistry(prev => ({
      ...prev,
      [newId]: newAccount,
    }));

    return { success: true, user: newAccount };
  }, []);

  // Register Organisation
  const registerOrganisation = useCallback((orgData) => {
    const newId = orgData.orgId?.trim() || `ORG-${Math.floor(300000 + Math.random() * 700000)}`;
    const newAccount = {
      id: newId,
      orgId: newId,
      name: orgData.adminName.trim(),
      email: orgData.email.trim(),
      password: orgData.password,
      role: 'organisation',
      organisation: orgData.orgName?.trim() || 'Enterprise Financial Institution',
      phone: orgData.phone?.trim() || '+91 77777 77777',
      designation: orgData.designation?.trim() || 'Security Administrator',
      joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      verified: true,
      city: orgData.city?.trim() || 'India',
      status: 'active',
      language: 'en',
      theme: 'luminous',
    };

    setUsersRegistry(prev => ({
      ...prev,
      [newId]: newAccount,
    }));

    return { success: true, user: newAccount };
  }, []);

  // Update Profile (editable non-protected fields)
  const updateProfile = useCallback((updatedFields) => {
    if (!user) return { success: false, error: 'No active session' };

    // Disallow altering protected identity keys directly
    const protectedKeys = ['id', 'role', 'accountId', 'analystId', 'orgId', 'verified', 'clearanceLevel', 'joinDate'];
    const safeUpdates = { ...updatedFields };
    protectedKeys.forEach(k => delete safeUpdates[k]);

    const updatedUser = { ...user, ...safeUpdates };
    setUser(updatedUser);

    setUsersRegistry(prev => ({
      ...prev,
      [user.id]: {
        ...(prev[user.id] || user),
        ...safeUpdates,
      }
    }));

    return { success: true, user: updatedUser };
  }, [user]);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (user?.id) {
        sessionStorage.removeItem('fraudx_welcomed_' + user.id);
      }
      sessionStorage.removeItem('fraudx_welcomed_customer');
      sessionStorage.removeItem('fraudx-current-user');
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
    setUser(null);
    setSelectedRole(null);
    setIsAuthenticated(false);
  }, [user]);

  const value = useMemo(() => ({
    user,
    selectedRole,
    isAuthenticated,
    authenticate,
    login,
    logout,
    setSelectedRole,
    registerCustomer,
    registerAnalyst,
    registerOrganisation,
    updateProfile,
    usersRegistry,
    demoUsers: DEFAULT_DEMO_USERS,
  }), [user, selectedRole, isAuthenticated, authenticate, login, logout, registerCustomer, registerAnalyst, registerOrganisation, updateProfile, usersRegistry]);

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
