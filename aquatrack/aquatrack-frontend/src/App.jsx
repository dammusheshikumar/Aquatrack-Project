import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import ProtectedRoute from './routes/ProtectedRoute'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import ResidentDashboard from './pages/ResidentDashboard'
import AdminConsole from './pages/AdminConsole'

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/resident/*"
            element={
              <ProtectedRoute allowedRoles={['RESIDENT']}>
                <ResidentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
                <AdminConsole />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  )
}
