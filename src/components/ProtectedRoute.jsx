
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";

export default function ProtectedRoute({ children, requireSuperAdmin = false }) {
  const { currentUser, loading, isSuperAdmin } = useAuth();
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setShowTimeout(true);
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    } else {
      setShowTimeout(false);
    }
  }, [loading]);

  if (loading) {
    if (showTimeout) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Loading is taking longer than expected</h2>
            <p className="text-muted-foreground">There may be a connection issue.</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return children;
}
