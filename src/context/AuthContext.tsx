import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserProfile, UserRole } from '../types';
import { authApi, profileApi } from '../api/services';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (data: { fullName: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const token = localStorage.getItem('labelcheck_token');
        if (token) {
          const currentUser = await authApi.getCurrentUser();
          setUser(currentUser);
        }
      } catch (err) {
        console.error('Failed to load user session', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(email, pass);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: { fullName: string; email: string; password: string }) => {
    setIsLoading(true);
    try {
      const res = await authApi.register(data);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
  };

  const updateProfile = async (profileData: Partial<UserProfile>) => {
    if (!user) return;
    const updatedUser = await profileApi.updateProfile(profileData);
    setUser(updatedUser);
  };

  const switchRole = (role: UserRole) => {
    if (!user) return;
    const updated = { ...user, role };
    setUser(updated);
    localStorage.setItem('labelcheck_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        switchRole,
      }}
    >
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
