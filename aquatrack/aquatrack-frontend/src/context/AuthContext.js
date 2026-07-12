import React, { createContext, useContext, useState } from "react";
import axiosClient from "../api/axiosClient";

const AuthContext = createContext(null);

function persistSession(data) {
  localStorage.setItem("aquatrack_token", data.token);
  localStorage.setItem("aquatrack_user", JSON.stringify(data));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("aquatrack_user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = async (username, password) => {
    const res = await axiosClient.post("/auth/login", { username, password });
    const data = res.data;
    persistSession(data);
    setUser(data);
    return data;
  };

  const register = async (payload) => {
    const res = await axiosClient.post("/auth/register", payload);
    const data = res.data;
    persistSession(data);
    setUser(data);
    return data;
  };

  /**
   * Sends the Google ID token (from Google Identity Services) to the backend.
   * If a matching resident account exists, logs in and returns { accountExists: true }.
   * Otherwise returns { accountExists: false, googleEmail, googleFullName } so the
   * caller can collect apartment + flat number and call googleRegister().
   */
  const googleLogin = async (idToken) => {
    const res = await axiosClient.post("/auth/google/login", { idToken });
    const data = res.data;
    if (data.accountExists) {
      persistSession(data.auth);
      setUser(data.auth);
    }
    return data;
  };

  const googleRegister = async (idToken, apartmentId, flatNumber) => {
    const res = await axiosClient.post("/auth/google/register", { idToken, apartmentId, flatNumber });
    const data = res.data;
    persistSession(data);
    setUser(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("aquatrack_token");
    localStorage.removeItem("aquatrack_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, googleLogin, googleRegister, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}