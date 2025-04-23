
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import GuestList from "./pages/GuestList";
import Guests from "./pages/Guests";
import MessagesDashboard from "./pages/MessagesDashboard";
import PropertyAnalytics from "./pages/PropertyAnalytics";
import FaqEditor from "./pages/FaqEditor";
import GuestManager from "./pages/GuestManager";
import PropertyManager from "./pages/PropertyManager";
import Properties from "./pages/Properties";
import SmartInsights from "./pages/SmartInsights";
import AddProperty from './pages/AddProperty';
import AddGuest from './AddGuest';
import Layout from "./components/Layout";
import { Toaster } from "@/components/ui/toaster";

export default function App() {
  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route
          path="/dashboard"
          element={
            <Layout>
              <Dashboard />
            </Layout>
          }
        />
        <Route
          path="/dashboard/guests"
          element={
            <Navigate to="/dashboard/guests-manager" />
          }
        />
        <Route
          path="/dashboard/messages"
          element={
            <Layout>
              <MessagesDashboard />
            </Layout>
          }
        />
        <Route
          path="/dashboard/analytics"
          element={
            <Layout>
              <PropertyAnalytics />
            </Layout>
          }
        />
        <Route
          path="/dashboard/faq-editor"
          element={
            <Layout>
              <FaqEditor />
            </Layout>
          }
        />
        <Route
          path="/dashboard/guests-manager"
          element={
            <Layout>
              <GuestManager />
            </Layout>
          }
        />
        <Route
          path="/dashboard/add-guest"
          element={
            <Layout>
              <AddGuest />
            </Layout>
          }
        />
        <Route
          path="/dashboard/properties-manager"
          element={
            <Layout>
              <PropertyManager />
            </Layout>
          }
        />
        <Route
          path="/dashboard/properties"
          element={
            <Layout>
              <Properties />
            </Layout>
          }
        />
        <Route
          path="/dashboard/add-property"
          element={
            <Layout>
              <AddProperty />
            </Layout>
          }
        />
        <Route
          path="/dashboard/insights"
          element={
            <Layout>
              <SmartInsights />
            </Layout>
          }
        />
      </Routes>
    </>
  );
}
