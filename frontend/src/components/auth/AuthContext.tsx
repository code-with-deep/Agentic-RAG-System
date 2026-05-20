import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  name: string;
  email: string;
  avatar_initials: string;
  joined_date: string;
  plan: 'free' | 'pro';
  token: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('docmind_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        // Ensure stored user has a token — otherwise it's a stale fake session
        if (parsed && parsed.token) {
          setUser(parsed);
        } else {
          localStorage.removeItem('docmind_user');
        }
      } catch (e) {
        console.error('Failed to parse stored user', e);
        localStorage.removeItem('docmind_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('docmind_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('docmind_user');
  };

  if (isLoading) return null;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
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
