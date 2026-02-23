
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { GmailAuthProvider } from "./context/GmailAuthContext";
import { ToastProvider } from "./context/ToastContext";
import { SidebarProvider } from "./context/SidebarContext";
import { UpgradeModalProvider } from "./context/UpgradeModalContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./Login";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import AddProperty from "./pages/AddProperty";
import PropertyManager from "./pages/PropertyManager";
import GuestManager from "./pages/GuestManager";
import MessagesDashboard from "./MessagesDashboard";
import SmartInsights from "./pages/SmartInsights";
import EmailManagement from "./pages/EmailManagement";
import SmsTestingDashboard from "./pages/SmsTestingDashboard";
import SmsConciergeTest from "./pages/SmsConciergeTest";
import PropertyAnalytics from "./pages/PropertyAnalytics";
import AnalyticsOverview from "./pages/AnalyticsOverview";
import AnalyticsInsights from "./pages/AnalyticsInsights";
import AnalyticsQuality from "./pages/AnalyticsQuality";
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

import AdminPanel from "./pages/AdminPanel";
import AdminPropertiesView from "./pages/AdminPropertiesView";
import UserSmsTest from "./pages/UserSmsTest";
import SystemDiagnostics from "./pages/SystemDiagnostics";
import InstallApp from "./pages/InstallApp";
import PwaUpdatePrompt from "./components/PwaUpdatePrompt";
import PwaInstallPrompt from "./components/PwaInstallPrompt";


import SnapPro from "./pages/SnapPro";
import SnapProLibrary from "./pages/SnapProLibrary";
import HostAcademy from "./pages/HostAcademy";
import AcademyLibrary from "./pages/AcademyLibrary";
import AcademyVideo from "./pages/AcademyVideo";
import AcademyProgress from "./pages/AcademyProgress";
import ProductGate from "./components/ProductGate";
import UpgradeModal from "./components/UpgradeModal";
import { EntitlementProvider } from "./context/EntitlementContext";
import MyProducts from "./pages/MyProducts";
import Billing from "./pages/Billing";
import Support from "./pages/Support";
import Pricing from "./pages/Pricing";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <SidebarProvider>
            <GmailAuthProvider>
              <ToastProvider>
                <UpgradeModalProvider>
                <EntitlementProvider>
                <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pricing" element={<Pricing />} />
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

              {/* AI Concierge - gated under /concierge */}
              <Route path="/concierge/properties" element={
                <ProtectedRoute><ProductGate productId="ai_concierge"><Properties /></ProductGate></ProtectedRoute>
              } />
              <Route path="/concierge/messages" element={
                <ProtectedRoute><ProductGate productId="ai_concierge"><MessagesDashboard /></ProductGate></ProtectedRoute>
              } />
              <Route path="/concierge/test" element={
                <ProtectedRoute><ProductGate productId="ai_concierge"><UserSmsTest /></ProductGate></ProtectedRoute>
              } />
              <Route path="/concierge/knowledge-base" element={
                <ProtectedRoute><ProductGate productId="ai_concierge"><KnowledgeBaseEditor /></ProductGate></ProtectedRoute>
              } />
              <Route path="/concierge/faq" element={
                <ProtectedRoute><ProductGate productId="ai_concierge"><FaqEditor /></ProductGate></ProtectedRoute>
              } />
              <Route path="/concierge/travel-guide" element={
                <ProtectedRoute><ProductGate productId="ai_concierge"><TravelGuideAdmin /></ProductGate></ProtectedRoute>
              } />
              <Route path="/email-management" element={
                <ProtectedRoute><ProductGate productId="ai_concierge"><EmailManagement /></ProductGate></ProtectedRoute>
              } />

              {/* Backward compatibility redirects */}
              <Route path="/messages" element={<Navigate to="/concierge/messages" replace />} />
              <Route path="/test-responses" element={<Navigate to="/concierge/test" replace />} />
              <Route path="/knowledge-base" element={<Navigate to="/concierge/knowledge-base" replace />} />
              <Route path="/faq-editor" element={<Navigate to="/concierge/faq" replace />} />
              <Route path="/travel-admin" element={<Navigate to="/concierge/travel-guide" replace />} />

              {/* Analytics - gated under /analytics */}
              <Route path="/analytics" element={
                <ProtectedRoute><ProductGate productId="analytics"><AnalyticsOverview /></ProductGate></ProtectedRoute>
              } />
              <Route path="/analytics/insights" element={
                <ProtectedRoute><ProductGate productId="analytics"><AnalyticsInsights /></ProductGate></ProtectedRoute>
              } />
              <Route path="/analytics/quality" element={
                <ProtectedRoute><ProductGate productId="analytics"><AnalyticsQuality /></ProductGate></ProtectedRoute>
              } />

              {/* Backward compatibility redirects for analytics */}
              <Route path="/insights" element={<Navigate to="/analytics/insights" replace />} />
              <Route path="/quality-analytics" element={<Navigate to="/analytics/quality" replace />} />

              {/* New product pages */}
              <Route path="/snappro" element={
                <ProtectedRoute><ProductGate productId="snappro"><SnapPro /></ProductGate></ProtectedRoute>
              } />
              <Route path="/snappro/library" element={
                <ProtectedRoute><ProductGate productId="snappro"><SnapProLibrary /></ProductGate></ProtectedRoute>
              } />
              {/* Host Academy - gated */}
              <Route path="/academy" element={
                <ProtectedRoute><ProductGate productId="academy"><AcademyLibrary /></ProductGate></ProtectedRoute>
              } />
              <Route path="/academy/video/:id" element={
                <ProtectedRoute><ProductGate productId="academy"><AcademyVideo /></ProductGate></ProtectedRoute>
              } />
              <Route path="/academy/progress" element={
                <ProtectedRoute><ProductGate productId="academy"><AcademyProgress /></ProductGate></ProtectedRoute>
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
                <ProtectedRoute requireSuperAdmin><AdminPanel /></ProtectedRoute>
              } />
              <Route path="/admin/properties" element={
                <ProtectedRoute requireSuperAdmin><AdminPropertiesView /></ProtectedRoute>
              } />
              <Route path="/admin/system-diagnostics" element={
                <ProtectedRoute requireSuperAdmin><SystemDiagnostics /></ProtectedRoute>
              } />

              <Route path="/install" element={
                <ProtectedRoute><InstallApp /></ProtectedRoute>
              } />
              
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/dashboard/*" element={<Navigate to="/" replace />} />
              
              <Route path="*" element={<NotFound />} />
                </Routes>
                <UpgradeModal />
                </EntitlementProvider>
                </UpgradeModalProvider>
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
