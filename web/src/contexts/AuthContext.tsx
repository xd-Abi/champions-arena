import { createContext, useContext, useEffect, useState } from 'react';
import type { UserProfile } from '../services/profile';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  profile: UserProfile | null;
  login: () => void;
  logout: () => void;
  getToken: () => string | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to get cookie value
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const loadProfile = async () => {
    try {
      const { profileApi } = await import('../services/profile');
      const data = await profileApi.getMe();
      setProfile(data);
    } catch (error) {
      setProfile(null);
    }
  };

  useEffect(() => {
    // Check if user has access token in cookies
    const checkAuth = async () => {
      const token = getCookie('ca-auth');

      if (token) {
        setIsAuthenticated(true);
        await loadProfile();
      } else {
        setIsAuthenticated(false);
        setProfile(null);
      }

      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const getToken = () => {
    return getCookie('ca-auth');
  };

  const login = () => {
    // Redirect to OAuth authorization endpoint
    window.location.href =
      'https://champions-arena.itsabi.com/api/auth/authorize';
  };

  const logout = () => {
    // Clear cookies by setting expiration to past date
    document.cookie =
      'ca-auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    setIsAuthenticated(false);
    setProfile(null);
  };

  const refreshProfile = async () => {
    await loadProfile();
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, profile, login, logout, getToken, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
