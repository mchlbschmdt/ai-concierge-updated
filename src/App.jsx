
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { GmailAuthProvider } from "./context/GmailAuthContext";
import { ToastProvider } from "./context/ToastContext";
import { SidebarProvider } from "./context/SidebarContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./Login";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import AddProperty from "./pages/AddProperty";
import PropertyManager from "./pages/PropertyManager";
import GuestManager from "./pages/GuestManager";
import MessagesDashboard from "./pages/MessagesDashboard";
import SmartInsights from "./pages/SmartInsights";
import EmailManagement from "./pages/EmailManagement";
import SmsTestingDashboard from "./pages/SmsTestingDashboard";
import SmsConciergeTest from "./pages/SmsConciergeTest";
import PropertyAnalytics from "./pages/PropertyAnalytics";
import FaqEditor from "./pages/FaqEditor";
import KnowledgeBaseEditor from "./pages/KnowledgeBaseEditor";
import ResetPassword from "./pages/ResetPassword";
import GoogleAuthCallback from "./pages/GoogleAuthCallback";
import TravelGuideAdmin from "./pages/TravelGuideAdmin";
import Register from "./pages/Register";
import RecommendationQualityAnalytics from "./pages/RecommendationQualityAnalytics";
import SmsConversationsAdmin from "./pages/SmsConversationsAdmin";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import ProfileSettings from "./pages/ProfileSettings";
import UserManagement from "./pages/UserManagement";
import AdminDashboard from "./pages/AdminDashboard";
import AdminPropertiesView from "./pages/AdminPropertiesView";
import UserSmsTest from "./pages/UserSmsTest";
import SystemDiagnostics from "./pages/SystemDiagnostics";
import InstallApp from "./pages/InstallApp";
import PwaUpdatePrompt from "./components/PwaUpdatePrompt";
import PwaInstallPrompt from "./components/PwaInstallPrompt";
import AdminEntitlements from "./pages/AdminEntitlements";
import AdminAnnouncements from "./pages/AdminAnnouncements";
import SnapPro from "./pages/SnapPro";
import HostAcademy from "./pages/HostAcademy";
import ProductGate from "./components/ProductGate";
import MyProducts from "./pages/MyProducts";
import Billing from "./pages/Billing";
import Support from "./pages/Support";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <SidebarProvider>
            <GmailAuthProvider>
              <ToastProvider>
                <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/callback" element={<GoogleAuthCallback />} />
              <Route path="/onboarding" element={
                <ProtectedRoute><Onboarding /></ProtectedRoute>
              } />
              <Route path="/profile-settings" element={
                <ProtectedRoute><ProfileSettings /></ProtectedRoute>
              } />
              <Route path="/" element={
                <ProtectedRoute><Dashboard /></ProtectedRoute>
              } />
              <Route path="/properties" element={
                <ProtectedRoute><Properties /></ProtectedRoute>
              } />
              <Route path="/add-property" element={
                <ProtectedRoute><AddProperty /></ProtectedRoute>
              } />
              <Route path="/property/:id" element={
                <ProtectedRoute><PropertyManager /></ProtectedRoute>
              } />
              <Route path="/guests" element={
                <ProtectedRoute><GuestManager /></ProtectedRoute>
              } />

              {/* AI Concierge - gated */}
              <Route path="/messages" element={
                <ProtectedRoute><ProductGate productId="ai_concierge"><MessagesDashboard /></ProductGate></ProtectedRoute>
              } />
              <Route path="/email-management" element={
                <ProtectedRoute><ProductGate productId="ai_concierge"><EmailManagement /></ProductGate></ProtectedRoute>
              } />
              <Route path="/test-responses" element={
                <ProtectedRoute><ProductGate productId="ai_concierge"><UserSmsTest /></ProductGate></ProtectedRoute>
              } />
              <Route path="/knowledge-base" element={
                <ProtectedRoute><ProductGate productId="ai_concierge"><KnowledgeBaseEditor /></ProductGate></ProtectedRoute>
              } />
              <Route path="/faq-editor" element={
                <ProtectedRoute><ProductGate productId="ai_concierge"><FaqEditor /></ProductGate></ProtectedRoute>
              } />
              <Route path="/travel-admin" element={
                <ProtectedRoute><ProductGate productId="ai_concierge"><TravelGuideAdmin /></ProductGate></ProtectedRoute>
              } />

              {/* Analytics - gated */}
              <Route path="/analytics" element={
                <ProtectedRoute><ProductGate productId="analytics"><PropertyAnalytics /></ProductGate></ProtectedRoute>
              } />
              <Route path="/insights" element={
                <ProtectedRoute><ProductGate productId="analytics"><SmartInsights /></ProductGate></ProtectedRoute>
              } />
              <Route path="/quality-analytics" element={
                <ProtectedRoute><ProductGate productId="analytics"><RecommendationQualityAnalytics /></ProductGate></ProtectedRoute>
              } />

              {/* New product pages */}
              <Route path="/snappro" element={
                <ProtectedRoute><SnapPro /></ProtectedRoute>
              } />
              <Route path="/snappro/library" element={
                <ProtectedRoute><ProductGate productId="snappro"><SnapPro tab="library" /></ProductGate></ProtectedRoute>
              } />
              <Route path="/academy" element={
                <ProtectedRoute><HostAcademy /></ProtectedRoute>
              } />
              <Route path="/academy/progress" element={
                <ProtectedRoute><ProductGate productId="academy"><HostAcademy tab="progress" /></ProductGate></ProtectedRoute>
              } />

              {/* Platform pages */}
              <Route path="/products" element={
                <ProtectedRoute><MyProducts /></ProtectedRoute>
              } />
              <Route path="/billing" element={
                <ProtectedRoute><Billing /></ProtectedRoute>
              } />
              <Route path="/support" element={
                <ProtectedRoute><Support /></ProtectedRoute>
              } />

              <Route path="/sms-testing" element={
                <ProtectedRoute requireSuperAdmin><SmsTestingDashboard /></ProtectedRoute>
              } />
              <Route path="/sms-concierge-test" element={
                <ProtectedRoute requireSuperAdmin><SmsConciergeTest /></ProtectedRoute>
              } />
              <Route path="/sms-conversations" element={
                <ProtectedRoute><SmsConversationsAdmin /></ProtectedRoute>
              } />
              
              {/* Admin Routes */}
              <Route path="/admin" element={
                <ProtectedRoute requireSuperAdmin><AdminDashboard /></ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute requireSuperAdmin><UserManagement /></ProtectedRoute>
              } />
              <Route path="/admin/properties" element={
                <ProtectedRoute requireSuperAdmin><AdminPropertiesView /></ProtectedRoute>
              } />
              <Route path="/admin/system-diagnostics" element={
                <ProtectedRoute requireSuperAdmin><SystemDiagnostics /></ProtectedRoute>
              } />
              <Route path="/admin/entitlements" element={
                <ProtectedRoute requireSuperAdmin><AdminEntitlements /></ProtectedRoute>
              } />
              <Route path="/admin/announcements" element={
                <ProtectedRoute requireSuperAdmin><AdminAnnouncements /></ProtectedRoute>
              } />
              
              <Route path="/install" element={
                <ProtectedRoute><InstallApp /></ProtectedRoute>
              } />
              
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/dashboard/*" element={<Navigate to="/" replace />} />
              
              <Route path="*" element={<NotFound />} />
                </Routes>
                <PwaUpdatePrompt />
                <PwaInstallPrompt />
              </ToastProvider>
            </GmailAuthProvider>
          </SidebarProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
