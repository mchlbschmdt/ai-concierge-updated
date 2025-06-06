
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import GuestManager from "./pages/GuestManager";
import PropertyManager from "./pages/PropertyManager";
import Properties from "./pages/Properties";
import MessagesDashboard from "./pages/MessagesDashboard";
import FaqEditor from "./pages/FaqEditor";
import SmartInsights from "./pages/SmartInsights";
import PropertyAnalytics from "./pages/PropertyAnalytics";
import AddProperty from './pages/AddProperty';
import AddGuest from './AddGuest';
import EmailManagement from './pages/EmailManagement';
import SmsTestingDashboard from './pages/SmsTestingDashboard';
import Layout from "./components/Layout";
import GoogleAuthCallback from "./pages/GoogleAuthCallback";
import { Toaster } from "@/components/ui/toaster";

export default function App() {
  console.log("App component rendering with routes");
  
  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/dashboard/guests-manager" element={<Layout><GuestManager /></Layout>} />
        <Route path="/dashboard/properties-manager" element={<Layout><PropertyManager /></Layout>} />
        <Route path="/dashboard/properties" element={<Layout><Properties /></Layout>} />
        <Route path="/dashboard/messages" element={<Layout><MessagesDashboard /></Layout>} />
        <Route path="/dashboard/faq-editor" element={<Layout><FaqEditor /></Layout>} />
        <Route path="/dashboard/insights" element={<Layout><SmartInsights /></Layout>} />
        <Route path="/dashboard/add-property" element={<Layout><AddProperty /></Layout>} />
        <Route path="/dashboard/add-guest" element={<Layout><AddGuest /></Layout>} />
        <Route path="/dashboard/email-management" element={<Layout><EmailManagement /></Layout>} />
        <Route path="/dashboard/analytics" element={<Layout><PropertyAnalytics /></Layout>} />
        <Route path="/dashboard/sms-testing" element={<Layout><SmsTestingDashboard /></Layout>} />
        <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
      </Routes>
    </>
  );
}
