import React, { createContext, useContext, useState, useCallback } from 'react';
import { loginUser, registerUser } from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('aquatrack_user');
    return raw ? JSON.parse(raw) : null;
  });

  const persist = (data) => {
    localStorage.setItem('aquatrack_token', data.token);
    localStorage.setItem('aquatrack_user', JSON.stringify(data));
    setUser(data);
  };

  const login = useCallback(async (username, password) => {
    const data = await loginUser({ username, password });
    persist(data);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await registerUser(payload);
    persist(data);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('aquatrack_token');
    localStorage.removeItem('aquatrack_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
