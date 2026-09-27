import { createContext, useContext, useState, useMemo, useEffect } from 'react';

export const ROLES = {
  PUBLIC: 'public',
  NORMAL: 'normal',
  ADMIN: 'admin',
  COMMERCIAL: 'commercial'
};

export const ROLE_DEFINITIONS = {
  normal: {
    id: 'normal',
    role: 'normal',
    title: 'Researchers',
    subtitle: '',
    description: 'Access historical incident archives, run lightweight SAR classification, and support ongoing marine research analysis.',
    badge: 'RESEARCHERS',
    hideBadgeInPicker: true,
    accentColor: 'emerald'
  },
  admin: {
    id: 'admin',
    role: 'admin',
    title: 'Authorities',
    subtitle: 'Maritime Police / Coast Guard / Port State Control',
    description: 'Full forensic intelligence: SAR segmentation, 12h Lagrangian hindcast, DBSCAN clustering, and AIS vessel attribution.',
    badge: 'AUTHORITIES',
    accentColor: 'cyan'
  },
  commercial: {
    id: 'commercial',
    role: 'commercial',
    title: 'Commercial Operator',
    subtitle: 'Shipowner / Fleet / P&I Club',
    description: 'Trajectory consistency verification, P&I liability exposure calculation, and exoneration analytics.',
    badge: 'COMMERCIAL OPERATOR',
    accentColor: 'violet'
  }
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Holds a user state defaulting to { role: 'public' }
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check localStorage on initial load
    const storedAuth = localStorage.getItem('tritontrace_auth');
    if (storedAuth) {
      try {
        setUser(JSON.parse(storedAuth));
      } catch (e) {
        setUser({ role: 'public' });
      }
    } else {
      setUser({ role: 'public' });
    }
    setIsLoading(false);
  }, []);

  const login = (role, extraDetails = {}) => {
    const newUser = {
      role: role || 'normal',
      email: extraDetails.email || `${role}@tritontrace.io`,
      agency: extraDetails.agency || (role === 'admin' ? 'IT-COASTGUARD-PSC' : role === 'commercial' ? 'IMO-948271' : 'LOCAL-PATROL-04'),
      loginTimestamp: new Date().toISOString()
    };
    setUser(newUser);
    localStorage.setItem('tritontrace_auth', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser({ role: 'public' });
    localStorage.removeItem('tritontrace_auth');
  };

  const value = useMemo(() => ({
    user,
    isLoading,
    role: user?.role || 'public',
    isAuthenticated: user?.role && user.role !== 'public',
    roleDefinition: ROLE_DEFINITIONS[user?.role] || null,
    login,
    logout
  }), [user, isLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
