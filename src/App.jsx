
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { GmailAuthProvider } from "./context/GmailAuthContext";
import { ToastProvider } from "./context/ToastContext";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <GmailAuthProvider>
            <ToastProvider>
              <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/callback" element={<GoogleAuthCallback />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/properties" element={
                <ProtectedRoute>
                  <Properties />
                </ProtectedRoute>
              } />
              <Route path="/add-property" element={
                <ProtectedRoute>
                  <AddProperty />
                </ProtectedRoute>
              } />
              <Route path="/property/:id" element={
                <ProtectedRoute>
                  <PropertyManager />
                </ProtectedRoute>
              } />
              <Route path="/guests" element={
                <ProtectedRoute>
                  <GuestManager />
                </ProtectedRoute>
              } />
              <Route path="/messages" element={
                <ProtectedRoute>
                  <MessagesDashboard />
                </ProtectedRoute>
              } />
              <Route path="/insights" element={
                <ProtectedRoute>
                  <SmartInsights />
                </ProtectedRoute>
              } />
              <Route path="/email-management" element={
                <ProtectedRoute>
                  <EmailManagement />
                </ProtectedRoute>
              } />
              <Route path="/sms-testing" element={
                <ProtectedRoute>
                  <SmsTestingDashboard />
                </ProtectedRoute>
              } />
              <Route path="/sms-concierge-test" element={
                <ProtectedRoute>
                  <SmsConciergeTest />
                </ProtectedRoute>
              } />
              <Route path="/analytics" element={
                <ProtectedRoute>
                  <PropertyAnalytics />
                </ProtectedRoute>
              } />
              <Route path="/faq-editor" element={
                <ProtectedRoute>
                  <FaqEditor />
                </ProtectedRoute>
              } />
              <Route path="/knowledge-base" element={
                <ProtectedRoute>
                  <KnowledgeBaseEditor />
                </ProtectedRoute>
              } />
              <Route path="/travel-admin" element={
                <ProtectedRoute>
                  <TravelGuideAdmin />
                </ProtectedRoute>
              } />
              <Route path="/quality-analytics" element={
                <ProtectedRoute>
                  <RecommendationQualityAnalytics />
                </ProtectedRoute>
              } />
            </Routes>
            </ToastProvider>
          </GmailAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
