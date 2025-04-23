
import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Guests from "./pages/Guests";
import Properties from "./pages/Properties";
import MessagesDashboard from "./pages/MessagesDashboard";
import AddGuest from "./AddGuest";
import AddProperty from "./pages/AddProperty";
import GuestManager from "./pages/GuestManager";
import PropertyManager from "./pages/PropertyManager";
import Layout from "./components/Layout";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
      <Route path="/dashboard/guests" element={<Layout><Guests /></Layout>} />
      <Route path="/dashboard/properties" element={<Layout><Properties /></Layout>} />
      <Route path="/dashboard/messages" element={<Layout><MessagesDashboard /></Layout>} />
      <Route path="/dashboard/add-guest" element={<Layout><AddGuest /></Layout>} />
      <Route path="/dashboard/add-property" element={<Layout><AddProperty /></Layout>} />
      <Route path="/dashboard/guests-manager" element={<Layout><GuestManager /></Layout>} />
      <Route path="/dashboard/properties-manager" element={<Layout><PropertyManager /></Layout>} />
    </Routes>
  );
}

export default App;
