// app/context/AuthContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  sub: string;
  email: string;
  role: string;
  role_id: string;
  exp: number;
}

interface AuthContextType {
  token: string | null;
  user: DecodedToken | null;
  login: (token: string) => void;
  logout: () => void;
  isLoading: boolean;
  isAuthorized: (allowedRoles: string[]) => boolean; 
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  login: () => {},
  logout: () => {},
  isLoading: true,
  isAuthorized: () => false, 
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<DecodedToken | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = (token: string) => {
    setToken(token);
    localStorage.setItem("access_token", token);
    const decoded = jwtDecode<DecodedToken>(token);
    setUser(decoded);
    setIsLoading(false);
  };

  const logout = () => {
    setToken(null);
  setUser(null);
  // Clear all auth-related items from localStorage
  localStorage.removeItem("access_token");
  localStorage.removeItem("auth_email");  // Remove email
  localStorage.removeItem("user_id");    // Remove user ID
  setIsLoading(false);
  };

  // Add the isAuthorized function
  const isAuthorized = useCallback((allowedRoles: string[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  }, [user]);

  useEffect(() => {
    const storedToken = localStorage.getItem("access_token");
    if (storedToken) {
      try {
        const decoded = jwtDecode<DecodedToken>(storedToken);
        const now = Date.now() / 1000;
        if (decoded.exp > now) {
          setToken(storedToken);
          setUser(decoded);
        } else {
          logout();
        }
      } catch (error) {
        logout();
      }
    }
    setIsLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ 
      token, 
      user, 
      login, 
      logout, 
      isLoading,
      isAuthorized 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}