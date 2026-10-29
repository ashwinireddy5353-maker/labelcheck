import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, UserProfile } from '../types';
import { authApi, profileApi } from '../api/services';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (data: { fullName: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  updateAvatar: (file: File) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authRequestId = useRef(0);

  useEffect(() => {
    const requestId = ++authRequestId.current;
    const token = localStorage.getItem('labelcheck_token');

    if (!token) {
      localStorage.removeItem('labelcheck_user_id');
      localStorage.removeItem('labelcheck_user');
      setIsLoading(false);
      return;
    }

    async function loadUser() {
      try {
        const currentUser = await authApi.getCurrentUser();
        if (authRequestId.current === requestId && localStorage.getItem('labelcheck_token') === token) {
          localStorage.setItem('labelcheck_user_id', currentUser.id);
          localStorage.setItem(`labelcheck_user:${currentUser.id}`, JSON.stringify(currentUser));
          setUser(currentUser);
        }
      } catch {
        if (authRequestId.current === requestId && localStorage.getItem('labelcheck_token') === token) {
          localStorage.removeItem('labelcheck_token');
          localStorage.removeItem('labelcheck_user_id');
          setUser(null);
        }
      } finally {
        if (authRequestId.current === requestId) {
          setIsLoading(false);
        }
      }
    }
    loadUser();
  }, []);

  const login = async (email: string, pass: string) => {
    const requestId = ++authRequestId.current;
    localStorage.removeItem('labelcheck_token');
    localStorage.removeItem('labelcheck_user_id');
    localStorage.removeItem('labelcheck_user');
    setUser(null);
    setIsLoading(true);
    try {
      const res = await authApi.login(email, pass);
      if (authRequestId.current !== requestId) return;
      localStorage.setItem('labelcheck_token', res.token);
      try {
        const currentUser = await authApi.getCurrentUser();
        if (authRequestId.current !== requestId) return;
        if (
          currentUser.id !== res.user.id ||
          currentUser.email.toLowerCase() !== email.trim().toLowerCase() ||
          !currentUser.fullName?.trim()
        ) {
          throw new Error('The authenticated account could not be verified. Please try again.');
        }
        localStorage.setItem('labelcheck_user_id', currentUser.id);
        localStorage.setItem(`labelcheck_user:${currentUser.id}`, JSON.stringify(currentUser));
        setUser(currentUser);
      } catch (error) {
        if (authRequestId.current === requestId) {
          localStorage.removeItem('labelcheck_token');
          localStorage.removeItem('labelcheck_user_id');
          setUser(null);
        }
        throw error;
      }
    } finally {
      if (authRequestId.current === requestId) {
        setIsLoading(false);
      }
    }
  };

  const register = async (data: { fullName: string; email: string; password: string }) => {
    const requestId = ++authRequestId.current;
    localStorage.removeItem('labelcheck_token');
    localStorage.removeItem('labelcheck_user_id');
    localStorage.removeItem('labelcheck_user');
    setUser(null);
    setIsLoading(true);
    try {
      const res = await authApi.register(data);
      if (authRequestId.current !== requestId) return;
      localStorage.setItem('labelcheck_token', res.token);
      localStorage.setItem('labelcheck_user_id', res.user.id);
      localStorage.setItem(`labelcheck_user:${res.user.id}`, JSON.stringify(res.user));
      setUser(res.user);
    } finally {
      if (authRequestId.current === requestId) {
        setIsLoading(false);
      }
    }
  };

  const logout = async () => {
    ++authRequestId.current;
    const token = localStorage.getItem('labelcheck_token');
    setUser(null);
    setIsLoading(false);
    localStorage.removeItem('labelcheck_token');
    localStorage.removeItem('labelcheck_user_id');
    localStorage.removeItem('labelcheck_user');
    await authApi.logout(token);
  };

  const updateProfile = async (profileData: Partial<UserProfile>) => {
    if (!user) return;
    const updatedUser = await profileApi.updateProfile(profileData);
    setUser(updatedUser);
  };

  const updateAvatar = async (file: File) => {
    if (!user) {
      throw new Error('You must be signed in to update your profile picture.');
    }

    const requestId = authRequestId.current;
    const userId = user.id;
    const updatedUser = await profileApi.updateAvatar(file);
    if (authRequestId.current !== requestId || updatedUser.id !== userId) {
      throw new Error('Your session changed before the profile picture could be updated.');
    }

    localStorage.setItem('labelcheck_user_id', updatedUser.id);
    localStorage.setItem(`labelcheck_user:${updatedUser.id}`, JSON.stringify(updatedUser));
    setUser(updatedUser);
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
        updateAvatar,
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
