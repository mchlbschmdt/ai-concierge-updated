// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import App from "./App";
import Login from "./Login";
import Register from "./Register";
import AdminDashboard from "./AdminDashboard";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));

const getCurrentUserRole = () =>
  new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        resolve(docSnap.data()?.role || "None");
      } else {
        resolve(null);
      }
    });
  });

function ProtectedRoute({ children, roles = [] }) {
  const [role, setRole] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getCurrentUserRole().then((r) => {
      setRole(r);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-center mt-10">Loading...</div>;
  if (!role) return <Navigate to="/login" />;
  if (!roles.includes(role)) return <div className="text-red-500 text-center mt-10">Access Denied</div>;

  return children;
}

root.render(
  <React.StrictMode>
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={["superadmin", "admin", "property_director", "hosting_manager"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<div style={{ textAlign: "center", marginTop: "100px" }}>404 Not Found</div>} />
        </Routes>
      </Router>
    </AuthProvider>
  </React.StrictMode>
);
