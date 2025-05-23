
import { createContext, useContext, useEffect, useState } from "react";

const GmailAuthContext = createContext();

export function GmailAuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Check localStorage on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem('google_authenticated');
    const savedEmail = localStorage.getItem('google_email');
    
    if (savedAuth === 'true' && savedEmail) {
      setIsAuthenticated(true);
      setUserEmail(savedEmail);
    }
    
    setLoading(false);
  }, []);
  
  // Function to sign out
  const signOut = () => {
    localStorage.removeItem('google_authenticated');
    localStorage.removeItem('google_email');
    setIsAuthenticated(false);
    setUserEmail(null);
  };
  
  // Function to update auth state
  const updateAuthState = (email) => {
    localStorage.setItem('google_authenticated', 'true');
    localStorage.setItem('google_email', email);
    setIsAuthenticated(true);
    setUserEmail(email);
  };
  
  return (
    <GmailAuthContext.Provider value={{ 
      isAuthenticated, 
      userEmail, 
      loading,
      signOut,
      updateAuthState
    }}>
      {children}
    </GmailAuthContext.Provider>
  );
}

export function useGmailAuth() {
  return useContext(GmailAuthContext);
}
