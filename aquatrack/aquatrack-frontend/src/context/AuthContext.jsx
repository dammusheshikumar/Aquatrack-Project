import React, { createContext, useContext, useState } from 'react'
import axiosClient from '../api/axiosClient'

const AuthContext = createContext(null)

function persistSession(data) {
  localStorage.setItem('aquatrack_token', data.token)
  localStorage.setItem('aquatrack_user', JSON.stringify(data))
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('aquatrack_user')
    return stored ? JSON.parse(stored) : null
  })

  const login = async (username, password) => {
    const res = await axiosClient.post('/auth/login', { username, password })
    const data = res.data
    persistSession(data)
    setUser(data)
    return data
  }

  /**
   * Returns the RegisterResponse: { pendingApproval, message, auth }.
   * Only logs the user in immediately if no approval was required (admins).
   */
  const register = async (payload) => {
    const res = await axiosClient.post('/auth/register', payload)
    const data = res.data
    if (!data.pendingApproval && data.auth) {
      persistSession(data.auth)
      setUser(data.auth)
    }
    return data
  }

  /**
   * Sends the Google ID token (from Google Identity Services) to the backend.
   * Returns { accountExists, pendingApproval, auth, googleEmail, googleFullName }.
   */
  const googleLogin = async (idToken) => {
    const res = await axiosClient.post('/auth/google/login', { idToken })
    const data = res.data
    if (data.accountExists && !data.pendingApproval && data.auth) {
      persistSession(data.auth)
      setUser(data.auth)
    }
    return data
  }

  const googleRegister = async (idToken, apartmentId, flatNumber) => {
    const res = await axiosClient.post('/auth/google/register', { idToken, apartmentId, flatNumber })
    return res.data // pending-approval confirmation message string
  }

  const logout = () => {
    localStorage.removeItem('aquatrack_token')
    localStorage.removeItem('aquatrack_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, googleLogin, googleRegister, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
