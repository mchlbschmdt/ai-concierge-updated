
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './Login';
import Register from './Register';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import PropertyManager from './pages/PropertyManager';
import GuestManager from './pages/GuestManager';
import MessagesDashboard from './pages/MessagesDashboard';
import EmailManagement from './pages/EmailManagement';
import SmsTestingDashboard from './pages/SmsTestingDashboard';
import AddProperty from './pages/AddProperty';
import './App.css';

function App() {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={!currentUser ? <Login /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/register" 
          element={!currentUser ? <Register /> : <Navigate to="/dashboard" />} 
        />
        
        {/* Home route - redirect based on auth status */}
        <Route 
          path="/" 
          element={
            currentUser ? (
              <Navigate to="/dashboard" />
            ) : (
              <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
                  <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      🏨 Hostly AI Concierge
                    </h1>
                    <p className="text-gray-600">
                      Your intelligent property management assistant
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <a 
                      href="/login"
                      className="block w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Sign In
                    </a>
                    <a 
                      href="/register"
                      className="block w-full border border-blue-600 text-blue-600 py-3 px-6 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                    >
                      Create Account
                    </a>
                  </div>
                  
                  <div className="mt-8 text-sm text-gray-500">
                    Manage properties, communicate with guests, and automate your hosting experience.
                  </div>
                </div>
              </div>
            )
          } 
        />
        
        {/* Protected dashboard routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'superadmin', 'property-director', 'hosting-manager']}>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/dashboard/properties" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'superadmin', 'property-director', 'hosting-manager']}>
              <Properties />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/dashboard/properties-manager" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'superadmin', 'property-director', 'hosting-manager']}>
              <PropertyManager />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/dashboard/add-property" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'superadmin', 'property-director', 'hosting-manager']}>
              <AddProperty />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/dashboard/guests-manager" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'superadmin', 'property-director', 'hosting-manager']}>
              <GuestManager />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/dashboard/messages" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'superadmin', 'property-director', 'hosting-manager']}>
              <MessagesDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/dashboard/email-management" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'superadmin', 'property-director', 'hosting-manager']}>
              <EmailManagement />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/dashboard/sms-testing" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'superadmin', 'property-director', 'hosting-manager']}>
              <SmsTestingDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      <Toaster />
    </div>
  );
}

export default App;
