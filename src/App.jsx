
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Toaster } from "./components/ui/toaster";
import ResetPassword from "./pages/ResetPassword";
import Login from "./Login";
import Dashboard from "./pages/Dashboard";
import Register from "./Register";
import PrivateRoute from "./PrivateRoute";
import Properties from "./pages/Properties";
import PropertyManager from "./pages/PropertyManager";
import GuestManager from "./pages/GuestManager";
import MessagesDashboard from "./pages/MessagesDashboard";
import EmailManagement from "./pages/EmailManagement";
import SmsTestingDashboard from "./pages/SmsTestingDashboard";

export default function App() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route 
          path="/" 
          element={
            currentUser ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
          } 
        />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/properties"
          element={
            <PrivateRoute>
              <Properties />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/properties-manager"
          element={
            <PrivateRoute>
              <PropertyManager />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/guests-manager"
          element={
            <PrivateRoute>
              <GuestManager />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/messages"
          element={
            <PrivateRoute>
              <MessagesDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/email-management"
          element={
            <PrivateRoute>
              <EmailManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/sms-testing"
          element={
            <PrivateRoute>
              <SmsTestingDashboard />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}
