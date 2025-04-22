// src/ProtectedRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export default function ProtectedRoute({ children, roles = [] }) {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        setRole(docSnap.data()?.role || "none");
      } else {
        setRole(null);
      }
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-center mt-10">Loading...</div>;
  if (!role) return <Navigate to="/login" />;
  if (!roles.includes(role)) return <div className="text-red-500 text-center mt-10">Access Denied</div>;

  return children;
}
