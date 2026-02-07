import { createContext, useContext, ReactNode, useState, useEffect } from 'react';

export interface User {
  user_id: string;
  email: string;
  name?: string;
  created_at: string;
  status: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, name: string, password: string, selectedProgram?: string, selectedPlan?: string) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check localStorage for user session
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // TODO: Call actual API endpoint
      // const response = await fetch('/api/auth/login', { ... })
      
      // For now, simulate login
      const mockUser: User = {
        user_id: `user_${Date.now()}`,
        email,
        name: email.split('@')[0],
        created_at: new Date().toISOString(),
        status: 'active',
      };
      
      localStorage.setItem('user', JSON.stringify(mockUser));
      setUser(mockUser);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      // TODO: Call actual API endpoint
      localStorage.removeItem('user');
      localStorage.removeItem('selectedProgram');
      localStorage.removeItem('selectedPlan');
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (
    email: string,
    name: string,
    password: string,
    selectedProgram?: string,
    selectedPlan?: string
  ) => {
    setLoading(true);
    try {
      // Store program selection in localStorage for checkout
      if (selectedProgram) {
        localStorage.setItem('selectedProgram', selectedProgram);
      }
      if (selectedPlan) {
        localStorage.setItem('selectedPlan', selectedPlan);
      }

      // TODO: Call actual API endpoint
      // const response = await fetch('/api/auth/signup', { ... })
      
      // For now, simulate signup
      const mockUser: User = {
        user_id: `user_${Date.now()}`,
        email,
        name,
        created_at: new Date().toISOString(),
        status: 'active',
      };
      
      localStorage.setItem('user', JSON.stringify(mockUser));
      setUser(mockUser);
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    signup,
    isAuthenticated: user !== null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
